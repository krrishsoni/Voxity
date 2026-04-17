import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function VoterDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, xp, level")
    .eq("id", user.id)
    .single();

  const { data: votes } = await supabase
    .from("votes")
    .select("poll_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const votedPollIds = Array.from(new Set((votes ?? []).map((vote) => vote.poll_id)));

  const { data: votedPolls } = votedPollIds.length
    ? await supabase.from("polls").select("id, title, created_at").in("id", votedPollIds)
    : { data: [] as { id: string; title: string; created_at: string }[] };

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="card">
        <p className="chip">Voter dashboard</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome back, {profile?.username ?? "Voter"}</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">XP</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{profile?.xp ?? 0}</p>
          </div>
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Level</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{profile?.level ?? "Freshman"}</p>
          </div>
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Polls voted</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{votedPollIds.length}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent voted polls</h2>
          <Link href="/" className="btn-secondary">
            Explore polls
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {(votedPolls ?? []).map((poll) => (
            <Link key={poll.id} href={`/vote/${poll.id}`} className="inner-card block p-3 transition hover:-translate-y-0.5">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{poll.title}</p>
            </Link>
          ))}

          {(votedPolls ?? []).length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">You have not voted in any poll yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
