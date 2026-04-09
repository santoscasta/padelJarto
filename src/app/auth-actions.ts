"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ORGANIZER_ID, DEMO_PLAYER_ID } from "@/lib/domain/mock-data";
import { getAppUrl, isDemoEnabled } from "@/lib/env";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? null));

  if (!email || !password) {
    redirect(`/login?error=missing_fields&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`/login?error=supabase_unavailable&next=${encodeURIComponent(nextPath)}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=invalid_credentials&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(nextPath);
}

export async function signUpWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? null));

  if (!email || !password || password.length < 6) {
    redirect(`/login?error=weak_password&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`/login?error=supabase_unavailable&next=${encodeURIComponent(nextPath)}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split("@")[0] },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    redirect(`/login?error=signup_failed&next=${encodeURIComponent(nextPath)}`);
  }

  if (data.session) {
    redirect(nextPath);
  }

  redirect(`/login?sent=confirm&next=${encodeURIComponent(nextPath)}`);
}

export async function signInAsDemoAction(formData: FormData) {
  if (!isDemoEnabled) {
    redirect("/login");
  }

  const requested = String(formData.get("session") ?? "organizer");
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? null));
  const cookieStore = await cookies();
  cookieStore.set(
    DEMO_SESSION_COOKIE,
    requested === "player" ? DEMO_PLAYER_ID : DEMO_ORGANIZER_ID,
    {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
  redirect(nextPath);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  redirect("/");
}
