import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServerEnv } from '@/lib/env';

export async function createServerSupabase() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; ignore — middleware refreshes them.
        }
      },
    },
  });
}
