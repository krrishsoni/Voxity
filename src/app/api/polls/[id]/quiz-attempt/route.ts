import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const quizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  score: z.number().int().min(0),
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

  const parsed = quizAttemptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, passing_score")
    .eq("id", parsed.data.quizId)
    .eq("poll_id", params.id)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const passed = parsed.data.score >= quiz.passing_score;

  const { error } = await supabase.from("quiz_attempts").insert({
    quiz_id: quiz.id,
    poll_id: params.id,
    user_id: user.id,
    score: parsed.data.score,
    passed,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ passed, passingScore: quiz.passing_score });
}
