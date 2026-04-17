"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { QrPoster } from "@/components/polls/qr-poster";
import { useToast } from "@/components/toast";
import { VoterAvatarStack } from "@/components/avatar";

type PollOption = {
  id: string;
  text: string;
  vote_count: number;
  image_url: string | null;
};

type Voter = { username: string; avatar_url: string | null };

type VotePanelProps = {
  pollId: string;
  title: string;
  isBlind: boolean;
  closed: boolean;
  hasVotedInitially: boolean;
  options: PollOption[];
  votersByOption: Record<string, Voter[]>;
  currentUser: Voter | null;
  voteUrl: string;
  quiz: {
    id: string;
    passingScore: number;
    hasPassed: boolean;
    questions: {
      id: string;
      question_text: string;
      quiz_answers: { id: string; text: string; is_correct: boolean }[];
    }[];
  } | null;
  analytics: {
    qrScans: number;
    totalVotes: number;
    conversionRate: number;
  } | null;
};

function getDeviceToken() {
  const key = "campus-pulse-device-token";
  const current = localStorage.getItem(key);
  if (current) return current;

  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function VotePanel({
  pollId,
  title,
  isBlind,
  closed,
  hasVotedInitially,
  options: initialOptions,
  votersByOption: initialVoters,
  currentUser,
  voteUrl,
  quiz,
  analytics,
}: VotePanelProps) {
  const [options, setOptions] = useState(initialOptions);
  const [voters, setVoters] = useState<Record<string, Voter[]>>(initialVoters);
  const [hasVoted, setHasVoted] = useState(hasVotedInitially);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(!quiz || quiz.hasPassed);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vote" | "share">("vote");
  const [copied, setCopied] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel(`poll-options-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "poll_options",
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          const next = payload.new as PollOption;
          setOptions((current) => current.map((option) => (option.id === next.id ? { ...option, vote_count: next.vote_count } : option)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, supabase]);

  const totalVotes = options.reduce((sum, option) => sum + option.vote_count, 0);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(voteUrl);
      setCopied(true);
      showToast("Link copied to clipboard!", "info");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy link on this browser.");
    }
  }

  const currentQuestion = quiz?.questions[quizIndex];

  async function submitQuizAttempt(finalScore: number) {
    if (!quiz) return;

    await fetch(`/api/polls/${pollId}/quiz/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: quiz.id, score: finalScore }),
    });
  }

  async function answerQuiz(answerId: string) {
    if (!quiz || !currentQuestion) return;

    const answer = currentQuestion.quiz_answers.find((item) => item.id === answerId);
    const gained = answer?.is_correct ? 1 : 0;
    const nextScore = quizScore + gained;
    const isLast = quizIndex + 1 >= quiz.questions.length;

    if (isLast) {
      await submitQuizAttempt(nextScore);
      if (nextScore >= quiz.passingScore) {
        setQuizUnlocked(true);
        setQuizResult(`Passed ${nextScore}/${quiz.questions.length}. Voting unlocked.`);
      } else {
        setQuizResult(`Try Again: ${nextScore}/${quiz.questions.length}. Need ${quiz.passingScore}.`);
      }
      setQuizScore(0);
      setQuizIndex(0);
      return;
    }

    setQuizScore(nextScore);
    setQuizIndex((prev) => prev + 1);
  }

  async function castVote(optionId: string) {
    setSubmitting(true);
    setError(null);

    try {
      const deviceToken = getDeviceToken();
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, deviceToken, isPowerVote: false }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Vote failed");
      }

      setHasVoted(true);
      // Add current user to the voted option's voter list
      if (currentUser) {
        setVoters((prev) => ({
          ...prev,
          [optionId]: [...(prev[optionId] ?? []), currentUser],
        }));
      }
      showToast("🗳️ Vote cast successfully!", "success");
    } catch (voteError) {
      const msg = voteError instanceof Error ? voteError.message : "Unable to submit vote";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="section-title">{title}</h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="live-dot" />
              Live updates enabled
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className={activeTab === "vote" ? "btn-primary" : "btn-secondary"}
              onClick={() => setActiveTab("vote")}
              type="button"
            >
              Vote
            </button>
            <button
              className={activeTab === "share" ? "btn-primary" : "btn-secondary"}
              onClick={() => setActiveTab("share")}
              type="button"
            >
              Share
            </button>
          </div>
        </div>
      </section>

      {activeTab === "share" ? (
        <section className="card space-y-3">
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Direct link</p>
            <p className="mt-1 break-all text-sm text-slate-700 dark:text-slate-300">{voteUrl}</p>
          </div>
          <button className="btn-secondary" type="button" onClick={copyLink}>
            {copied ? "Copied" : "Copy vote link"}
          </button>
        </section>
      ) : null}

      {activeTab === "vote" ? (
        <>
      {!quizUnlocked && quiz && quiz.questions.length > 0 ? (
        <section className="card">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Quick Quiz Unlock</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Question {quizIndex + 1} of {quiz.questions.length}
          </p>

          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
            <motion.div
              className="h-full rounded-full bg-slate-900 dark:bg-slate-200"
              initial={{ width: 0 }}
              animate={{ width: `${((quizIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>

          <motion.div
            key={currentQuestion?.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 inner-card p-4"
          >
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{currentQuestion?.question_text}</p>
            <div className="mt-3 space-y-2">
              {currentQuestion?.quiz_answers.map((answer) => (
                <button
                  key={answer.id}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => answerQuiz(answer.id)}
                  type="button"
                >
                  {answer.text}
                </button>
              ))}
            </div>
          </motion.div>

          {quizResult ? <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{quizResult}</p> : null}
        </section>
      ) : null}

      <section className="card">
        <div className="flex items-center justify-between">
          <p className="chip">{totalVotes} total votes</p>
        </div>
        {closed ? <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">Voting Closed</p> : null}

        <div className="mt-4 space-y-3">
          {options.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
            const showResults = hasVoted || !isBlind;

            return (
              <div key={option.id} className="inner-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{option.text}</p>
                  {!closed && !hasVoted && quizUnlocked ? (
                    <button
                      onClick={() => castVote(option.id)}
                      disabled={submitting}
                      className="btn-primary px-3 py-1 text-xs"
                      type="button"
                    >
                      Vote
                    </button>
                  ) : null}
                </div>

                {showResults ? (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>{option.vote_count} votes</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <motion.div
                        className="h-full rounded-full bg-slate-800 dark:bg-slate-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.45 }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Blind mode enabled. Results unlock after your vote.</p>
                )}

                {/* Voter avatars — always visible */}
                <VoterAvatarStack voters={voters[option.id] ?? []} />
              </div>
            );
          })}
        </div>

        {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{error}</p> : null}
      </section>

      </>
      ) : null}

      {analytics ? (
        <section className="card">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Creator Analytics</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="inner-card p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">QR scans</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{analytics.qrScans}</p>
            </div>
            <div className="inner-card p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total votes</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{analytics.totalVotes}</p>
            </div>
            <div className="inner-card p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Conversion</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{analytics.conversionRate}%</p>
            </div>
          </div>
        </section>
      ) : null}

      <QrPoster pollTitle={title} pollUrl={voteUrl} />
    </div>
  );
}
