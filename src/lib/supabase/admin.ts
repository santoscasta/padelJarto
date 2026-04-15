import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

/**
 * Service-role client — bypasses RLS. Use ONLY for:
 * - inserts into pairs, rating_snapshots, notifications
 * - trusted cross-user reads like invitation-by-token landing
 * NEVER expose this client to browser code.
 */
export function createAdminSupabase() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in the server environment.',
    );
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
