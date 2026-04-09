"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ORGANIZER_ID, DEMO_PLAYER_ID } from "@/lib/domain/mock-data";
import { getAppUrl, isDemoEnabled } from "@/lib/env";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? null));

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`/login?error=invalid_email&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`/login?error=supabase_unavailable&next=${encodeURIComponent(nextPath)}`);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/login?error=send_failed&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(`/login?sent=1&next=${encodeURIComponent(nextPath)}`);
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
