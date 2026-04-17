import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-md card">
      <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Use any valid email address to create your account.</p>

      {searchParams.error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {searchParams.error}
        </p>
      ) : null}

      <form action={signUpAction} className="mt-5 space-y-3">
        <input className="input-base" name="username" type="text" placeholder="Username" minLength={3} required />
        <input className="input-base" name="email" type="email" placeholder="you@example.com" required />
        <input className="input-base" name="password" type="password" placeholder="Password" minLength={8} required />
        <button className="btn-primary w-full justify-center" type="submit">
          Create account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline-offset-2 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
