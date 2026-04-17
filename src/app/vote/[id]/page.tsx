import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { VotePanel } from "@/components/polls/vote-panel";
import { createClient } from "@/lib/supabase/server";

function getRequestOrigin() {
  const h = headers();
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost || h.get("host");

  if (host) {
    return `${forwardedProto ?? "https"}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export default async function VotePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { source?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: poll } = await supabase
    .from("polls")
    .select("id, creator_id, title, description, is_blind, expires_at, qr_scans")
    .eq("id", params.id)
    .single();

  if (!poll) {
    notFound();
  }

  if (searchParams.source === "qr") {
    await supabase.rpc("increment_qr_scan", { p_poll_id: params.id });
  }

  const { data: options } = await supabase
    .from("poll_options")
    .select("id, text, vote_count, image_url")
    .eq("poll_id", params.id)
    .order("created_at", { ascending: true });

  // Fetch voters with profile info (username + avatar_url)
  const { data: rawVoters } = await supabase
    .from("votes")
    .select("option_id, profiles!inner(username, avatar_url)")
    .eq("poll_id", params.id);

  // Group voters by option_id
  const votersByOption: Record<string, { username: string; avatar_url: string | null }[]> = {};
  for (const row of rawVoters ?? []) {
    const profile = row.profiles as unknown as { username: string; avatar_url: string | null };
    if (!votersByOption[row.option_id]) {
      votersByOption[row.option_id] = [];
    }
    votersByOption[row.option_id].push({
      username: profile.username,
      avatar_url: profile.avatar_url,
    });
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, passing_score")
    .eq("poll_id", params.id)
    .maybeSingle();

  let quizQuestions: {
    id: string;
    question_text: string;
    quiz_answers: { id: string; text: string; is_correct: boolean }[];
  }[] = [];

  if (quiz) {
    const { data } = await supabase
      .from("quiz_questions")
      .select("id, question_text, quiz_answers(id, text, is_correct)")
      .eq("quiz_id", quiz.id)
      .order("created_at", { ascending: true });

    quizQuestions = data ?? [];
  }

  let hasPassedQuiz = false;
  if (quiz) {
    const { data: passedAttempt } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("quiz_id", quiz.id)
      .eq("poll_id", params.id)
      .eq("user_id", user.id)
      .eq("passed", true)
      .maybeSingle();
    hasPassedQuiz = Boolean(passedAttempt);
  }

  const { data: vote } = await supabase
    .from("votes")
    .select("id")
    .eq("poll_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Get current user's profile for avatar
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  const voteUrl = `${getRequestOrigin()}/live/${params.id}?source=qr`;
  const closed = Boolean(poll.expires_at && new Date(poll.expires_at).getTime() <= Date.now());
  const totalVotes = (options ?? []).reduce((sum, option) => sum + option.vote_count, 0);
  const analytics =
    poll.creator_id === user.id
      ? {
          qrScans: poll.qr_scans,
          totalVotes,
          conversionRate: poll.qr_scans > 0 ? Number(((totalVotes / poll.qr_scans) * 100).toFixed(1)) : 0,
        }
      : null;

  return (
    <VotePanel
      pollId={poll.id}
      title={poll.title}
      isBlind={poll.is_blind}
      closed={closed}
      hasVotedInitially={Boolean(vote)}
      options={options ?? []}
      votersByOption={votersByOption}
      currentUser={currentProfile ? { username: currentProfile.username, avatar_url: currentProfile.avatar_url } : null}
      voteUrl={voteUrl}
      quiz={
        quiz
          ? {
              id: quiz.id,
              passingScore: quiz.passing_score,
              questions: quizQuestions,
              hasPassed: hasPassedQuiz,
            }
          : null
      }
      analytics={analytics}
    />
  );
}
