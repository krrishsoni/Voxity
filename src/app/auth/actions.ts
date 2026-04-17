"use server";

import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function isRateLimitError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("rate") && lower.includes("limit");
}

function safeUsername(email: string) {
  return email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export async function signUpAction(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "");
  const email = normalizeEmail(emailRaw);
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? safeUsername(email));
  const userTypeRaw = String(formData.get("userType") ?? "voter");
  const userType = userTypeRaw === "caster" ? "caster" : "voter";

  if (password.length < 8) {
    redirect("/signup?error=Password must be at least 8 characters");
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, user_type: userType },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
    },
  });

  if (error) {
    if (isRateLimitError(error.message)) {
      redirect("/signup?error=Too many attempts. Please wait a minute and try again.");
    }
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      username,
      user_type: userType,
    });
  }

  redirect("/login?success=Account created. Please sign in.");
}

export async function signInAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("email not confirmed") || message.includes("not confirmed")) {
      redirect(
        `/login?error=${encodeURIComponent("Email not confirmed. Please verify your email or resend confirmation.")}&email=${encodeURIComponent(email)}&needsConfirmation=1`,
      );
    }

    if (isRateLimitError(error.message)) {
      redirect(
        `/login?error=${encodeURIComponent("Too many requests. Please wait a minute before retrying.")}&email=${encodeURIComponent(email)}`,
      );
    }

    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resendConfirmationAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) {
    redirect("/login?error=Please enter an email first.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
    },
  });

  if (error) {
    if (isRateLimitError(error.message)) {
      redirect(
        `/login?error=${encodeURIComponent("Email rate limit reached. Wait a minute before resending.")}&email=${encodeURIComponent(email)}&needsConfirmation=1`,
      );
    }
    redirect(`/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}&needsConfirmation=1`);
  }

  redirect(
    `/login?success=${encodeURIComponent("Confirmation email sent. Check inbox/spam.")}&email=${encodeURIComponent(email)}&needsConfirmation=1`,
  );
}