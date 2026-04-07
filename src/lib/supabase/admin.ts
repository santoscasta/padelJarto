import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseData } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!hasSupabaseData || !env.publicSupabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(env.publicSupabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
