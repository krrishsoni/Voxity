import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recentPolls } = await supabase
    .from("polls")
    .select("id, title, description, created_at, is_blind, privacy_mode")
    .order("created_at", { ascending: false })
    .limit(6);

  const [{ count: pollCount }, { count: voteCount }, { count: profileCount }] = await Promise.all([
    supabase.from("polls").select("id", { count: "exact", head: true }),
    supabase.from("votes").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden rounded-3xl p-6 shadow-lg sm:p-8">
        <div className="subtle-grid absolute inset-0 opacity-50" />
        <div className="relative">
          <p className="chip">
            <span className="live-dot" />
            Live Campus Network
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Make decisions together.
            <span className="block text-gradient">Fast, social, transparent.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Run blind or open polls, unlock participation with quizzes, and watch results update in real time.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="inner-card p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Polls created</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{pollCount ?? 0}</p>
            </div>
            <div className="inner-card p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Votes cast</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{voteCount ?? 0}</p>
            </div>
            <div className="inner-card p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Active students</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{profileCount ?? 0}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link href="/create" className="btn-primary">
                  Create Poll
                </Link>
                <Link href="/leaderboard" className="btn-secondary">
                  View Leaderboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="btn-primary">
                  Create free account
                </Link>
                <Link href="/login" className="btn-secondary">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Trending Polls</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tap any card to vote</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(recentPolls ?? []).map((poll) => (
          <Link
            key={poll.id}
            href={`/vote/${poll.id}`}
            className="group card p-4 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="chip">{poll.privacy_mode}</span>
              {poll.is_blind ? <span className="chip">blind</span> : <span className="chip">open</span>}
            </div>
            <h2 className="text-base font-semibold text-slate-900 transition group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-300">{poll.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{poll.description || "No description added yet."}</p>
          </Link>
        ))}
          {recentPolls?.length === 0 ? (
            <div className="col-span-full card border-dashed text-center">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No polls yet</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Start the first discussion by creating a poll.</p>
              <Link href="/create" className="btn-primary mt-4">
                Create First Poll
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
