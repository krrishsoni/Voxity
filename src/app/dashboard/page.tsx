import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: polls } = await supabase
    .from("polls")
    .select("id, title, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const pollIds = (polls ?? []).map((poll) => poll.id);

  const { data: options } = pollIds.length
    ? await supabase
        .from("poll_options")
        .select("poll_id, vote_count")
        .in("poll_id", pollIds)
    : { data: [] as { poll_id: string; vote_count: number }[] };

  const votesByPoll = new Map<string, number>();
  for (const option of options ?? []) {
    votesByPoll.set(option.poll_id, (votesByPoll.get(option.poll_id) ?? 0) + option.vote_count);
  }

  const totalVotes = Array.from(votesByPoll.values()).reduce((sum, value) => sum + value, 0);

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="card">
        <p className="chip">Caster dashboard</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Manage your poll sessions</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Created polls</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{polls?.length ?? 0}</p>
          </div>
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total votes</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{totalVotes}</p>
          </div>
          <div className="inner-card p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Live ready</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{polls?.length ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your polls</h2>
          <Link href="/create" className="btn-primary">
            Create new poll
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {(polls ?? []).map((poll) => (
            <div key={poll.id} className="inner-card flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{poll.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{votesByPoll.get(poll.id) ?? 0} votes</p>
              </div>

              <div className="flex gap-2">
                <Link href={`/host/${poll.id}/lobby`} className="btn-secondary">
                  Live lobby
                </Link>
                <Link href={`/vote/${poll.id}`} className="btn-ghost">
                  Open poll
                </Link>
              </div>
            </div>
          ))}

          {(polls ?? []).length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No polls yet. Start by creating one.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
