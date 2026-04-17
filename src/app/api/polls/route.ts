import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validatePollContent } from "@/lib/moderation";

const optionSchema = z.object({
  text: z.string().min(1).max(200),
  image_url: z.string().url().nullable().optional(),
});

const createPollSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000).default(""),
  is_blind: z.boolean().default(false),
  is_ephemeral: z.boolean().default(false),
  privacy_mode: z.enum(["public", "friends", "private"]).default("public"),
  options: z.array(optionSchema).min(2),
});

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createPollSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const moderationError = validatePollContent(
    parsed.data.title,
    parsed.data.options.map((option) => option.text),
  );

  if (moderationError) {
    return NextResponse.json({ error: moderationError }, { status: 400 });
  }

  const expires_at = parsed.data.is_ephemeral
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      creator_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      is_blind: parsed.data.is_blind,
      is_ephemeral: parsed.data.is_ephemeral,
      expires_at,
      privacy_mode: parsed.data.privacy_mode,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    return NextResponse.json({ error: pollError?.message || "Could not create poll" }, { status: 400 });
  }

  const { error: optionsError } = await supabase.from("poll_options").insert(
    parsed.data.options.map((option) => ({
      poll_id: poll.id,
      text: option.text,
      image_url: option.image_url ?? null,
    })),
  );

  if (optionsError) {
    return NextResponse.json({ error: optionsError.message }, { status: 400 });
  }

  return NextResponse.json({ pollId: poll.id });
}
