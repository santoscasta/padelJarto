"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseData } from "@/lib/env";

export async function updateProfileAction(formData: FormData) {
  const user = await requireCurrentUser();
  if (!hasSupabaseData) return;

  const sb = createSupabaseAdminClient();
  if (!sb) return;

  const username = (formData.get("username") as string)?.trim() || null;
  const level = formData.get("level") as string || null;
  const dominantHand = formData.get("dominantHand") as string || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const club = (formData.get("club") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;

  // Validate level
  const validLevels = ["beginner", "intermediate", "advanced", "pro"];
  const validHands = ["right", "left", "ambidextrous"];

  const { error } = await sb
    .from("profiles")
    .update({
      username,
      level: level && validLevels.includes(level) ? level : null,
      dominant_hand: dominantHand && validHands.includes(dominantHand) ? dominantHand : null,
      city,
      club,
      bio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error("Error al guardar el perfil: " + error.message);

  revalidatePath("/app/profile");
  revalidatePath("/app");
}
