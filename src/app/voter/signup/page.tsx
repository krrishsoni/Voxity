import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";

export default function VoterSignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <section className="mx-auto max-w-md card">
      <p className="chip">Voter onboarding</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Join as a Voter</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Create your voter account and join live sessions instantly via QR.
      </p>

      {searchParams.error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {searchParams.error}
        </p>
      ) : null}

      <form action={signUpAction} className="mt-5 space-y-3">
        <input type="hidden" name="userType" value="voter" />
        <input className="input-base" name="username" type="text" placeholder="Username" minLength={3} required />
        <input className="input-base" name="email" type="email" placeholder="you@example.com" required />
        <input className="input-base" name="password" type="password" placeholder="Password" minLength={8} required />
        <button className="btn-primary w-full justify-center" type="submit">
          Create voter account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
        Want to create and host polls?{" "}
        <Link href="/signup" className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100">
          Sign up as caster
        </Link>
      </p>
    </section>
  );
}
