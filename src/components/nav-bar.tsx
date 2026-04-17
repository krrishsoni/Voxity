import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/avatar";

export async function NavBar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; avatar_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="nav-header">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="nav-brand">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
            CP
          </span>
          <span>Campus Pulse</span>
        </Link>

        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/" className="btn-ghost">
            Home
          </Link>
          <Link href="/leaderboard" className="btn-ghost">
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link href="/create" className="btn-secondary">
                Create
              </Link>
              <span className="chip hidden items-center gap-2 sm:inline-flex">
                <UserAvatar
                  username={profile?.username ?? "U"}
                  avatarUrl={profile?.avatar_url}
                  size="sm"
                />
                <span className="max-w-[120px] truncate">{profile?.username ?? user.email}</span>
              </span>
              <form action={signOutAction}>
                <button className="btn-primary" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Signup
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
