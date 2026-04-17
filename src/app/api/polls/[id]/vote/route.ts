import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const voteSchema = z.object({
  optionId: z.string().uuid(),
  isPowerVote: z.boolean().optional().default(false),
  deviceToken: z.string().min(10).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = voteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vote payload" }, { status: 400 });
  }

  const { error } = await supabase.rpc("cast_vote", {
    p_poll_id: params.id,
    p_option_id: parsed.data.optionId,
    p_is_power_vote: parsed.data.isPowerVote,
    p_device_token: parsed.data.deviceToken ?? null,
  });

  if (error) {
    const duplicate = error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique");
    return NextResponse.json(
      { error: duplicate ? "You already voted in this poll." : error.message },
      { status: duplicate ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
