import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/domain/types";

export async function getFullProfile(userId: string): Promise<Profile | null> {
  const sb = createSupabaseAdminClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email ?? "",
    fullName: data.full_name ?? "",
    username: data.username ?? undefined,
    city: data.city ?? undefined,
    level: data.level ?? undefined,
    dominantHand: data.dominant_hand ?? undefined,
    avatarPath: data.avatar_path ?? undefined,
    club: data.club ?? undefined,
    bio: data.bio ?? undefined,
    createdAt: data.created_at ?? undefined,
  };
}
