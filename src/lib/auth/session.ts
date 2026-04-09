import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ORGANIZER_ID, DEMO_PLAYER_ID } from "@/lib/domain/mock-data";
import { type Profile } from "@/lib/domain/types";
import { hasSupabaseData, isDemoEnabled } from "@/lib/env";
import { getDemoStore } from "@/lib/repositories/demo-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_SESSION_COOKIE = "padeljarto-demo-session";

export async function getCurrentUser(): Promise<Profile | null> {
  if (hasSupabaseData) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return {
          avatarUrl: user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null,
          email: user.email ?? `${user.id}@padeljarto.local`,
          fullName:
            user.user_metadata.full_name ??
            user.user_metadata.name ??
            user.email?.split("@")[0] ??
            "Jugador",
          id: user.id,
        };
      }
    }
  }

  if (!isDemoEnabled) {
    return null;
  }

  const cookieStore = await cookies();
  const demoUserId = cookieStore.get(DEMO_SESSION_COOKIE)?.value;

  if (!demoUserId) {
    return null;
  }

  const fallbackId =
    demoUserId === "organizer"
      ? DEMO_ORGANIZER_ID
      : demoUserId === "player"
        ? DEMO_PLAYER_ID
        : demoUserId;
  return getDemoStore().profiles.find((profile) => profile.id === fallbackId) ?? null;
}

export async function requireCurrentUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}
