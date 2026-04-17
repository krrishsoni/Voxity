import Link from "next/link";
import { resendConfirmationAction, signInAction } from "@/app/auth/actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; email?: string; needsConfirmation?: string };
}) {
  const suggestedEmail = searchParams.email ?? "";
  const showResend = searchParams.needsConfirmation === "1";

  return (
    <div className="mx-auto max-w-md card">
      <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
      <p className="mt-1 text-sm text-slate-600">Use your email and password to continue.</p>

      {searchParams.error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {searchParams.error}
        </p>
      ) : null}

      {searchParams.success ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {searchParams.success}
        </p>
      ) : null}

      <form action={signInAction} className="mt-5 space-y-3">
        <input
          className="input-base"
          name="email"
          type="email"
          placeholder="you@example.com"
          defaultValue={suggestedEmail}
          required
        />
        <input className="input-base" name="password" type="password" placeholder="Password" required />
        <button className="btn-primary w-full justify-center" type="submit">
          Login
        </button>
      </form>

      {showResend ? (
        <form action={resendConfirmationAction} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-xs text-amber-900">Didn&apos;t get the email? Resend confirmation.</p>
          <input type="hidden" name="email" value={suggestedEmail} />
          <button className="btn-secondary w-full justify-center" type="submit">
            Resend confirmation email
          </button>
        </form>
      ) : null}

      <p className="mt-4 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-slate-900 underline-offset-2 hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
