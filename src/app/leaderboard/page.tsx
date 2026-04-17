import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { department?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const departmentFilter = searchParams.department?.trim();

  let query = supabase
    .from("profiles")
    .select("id, username, xp, level, department")
    .order("xp", { ascending: false })
    .limit(10);

  if (departmentFilter) {
    query = query.eq("department", departmentFilter);
  }

  const { data: leaders } = await query;
  const { data: departmentsRaw } = await supabase.from("profiles").select("department").not("department", "is", null).limit(1000);
  const departments = Array.from(new Set((departmentsRaw ?? []).map((item) => item.department).filter(Boolean))).sort();

  const podium = (leaders ?? []).slice(0, 3);
  const rest = (leaders ?? []).slice(3);

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="section-title">Weekly Leaderboard</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Top students ranked by XP growth this week.</p>
          </div>

          <form className="flex items-center gap-2" action="/leaderboard" method="get">
            <select name="department" className="input-base min-w-40" defaultValue={departmentFilter ?? ""}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <button className="btn-secondary" type="submit">
              Apply
            </button>
            {departmentFilter ? (
              <Link href="/leaderboard" className="btn-ghost">
                Clear
              </Link>
            ) : null}
          </form>
        </div>
      </div>

      {podium.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {podium.map((profile, index) => {
            const isCurrent = profile.id === user?.id;
            return (
              <div
                key={profile.id}
                className={`card ${isCurrent ? "border-slate-700 bg-slate-900 text-white" : ""}`}
              >
                <p className={`text-xs ${isCurrent ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>#{index + 1}</p>
                <h2 className={`mt-1 text-lg font-semibold ${isCurrent ? "" : "dark:text-slate-100"}`}>{profile.username}</h2>
                <p className={`text-xs ${isCurrent ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>{profile.level}</p>
                <p className={`mt-3 text-2xl font-bold ${isCurrent ? "" : "dark:text-slate-100"}`}>{profile.xp}</p>
                <p className={`text-xs ${isCurrent ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>XP</p>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="card space-y-2">
        {rest.length === 0 && podium.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No leaderboard entries yet.</p>
        ) : null}

        {rest.map((profile, index) => {
          const isCurrent = profile.id === user?.id;
          return (
            <div
              key={profile.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                isCurrent ? "border-slate-800 bg-slate-900 text-white" : "inner-card text-slate-800 dark:text-slate-200"
              }`}
            >
              <div>
                <p className="font-semibold">
                  #{index + 4} {profile.username}
                </p>
                <p className={`text-xs ${isCurrent ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>{profile.level}</p>
              </div>
              <p className="font-semibold">{profile.xp} XP</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
