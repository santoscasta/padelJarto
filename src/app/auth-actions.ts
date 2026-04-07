"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ORGANIZER_ID, DEMO_PLAYER_ID } from "@/lib/domain/mock-data";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAsDemoAction(formData: FormData) {
  const requested = String(formData.get("session") ?? "organizer");
  const nextPath = String(formData.get("next") ?? "/app");
  const cookieStore = await cookies();
  cookieStore.set(
    DEMO_SESSION_COOKIE,
    requested === "player" ? DEMO_PLAYER_ID : DEMO_ORGANIZER_ID,
    {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
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
