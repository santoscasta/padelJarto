import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationRow[]> {
  const sb = createSupabaseAdminClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const sb = createSupabaseAdminClient();
  if (!sb) return 0;
  const { count, error } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const sb = createSupabaseAdminClient();
  if (!sb) return;
  await sb
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const sb = createSupabaseAdminClient();
  if (!sb) return;
  await sb
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const sb = createSupabaseAdminClient();
  if (!sb) return;
  await sb.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  });
}
