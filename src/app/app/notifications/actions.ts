"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/repositories/notification-repository";

export async function markReadAction(formData: FormData) {
  const user = await requireCurrentUser();
  const notificationId = formData.get("notificationId") as string;
  if (!notificationId) return;
  await markNotificationRead(notificationId, user.id);
  revalidatePath("/app");
}

export async function markAllReadAction() {
  const user = await requireCurrentUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/app");
}
