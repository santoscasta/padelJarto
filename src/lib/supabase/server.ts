import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, hasSupabaseAuth } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!hasSupabaseAuth || !env.publicSupabaseUrl || !env.publicSupabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.publicSupabaseUrl, env.publicSupabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          return;
        }
      },
    },
  });
}
