"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseAuth } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseAuth || !env.publicSupabaseUrl || !env.publicSupabaseAnonKey) {
    return null;
  }

  return createBrowserClient(env.publicSupabaseUrl, env.publicSupabaseAnonKey);
}
