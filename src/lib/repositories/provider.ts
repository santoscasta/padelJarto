import type { Repository } from './types';
import { SupabaseRepository } from './supabase-repository';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

type RepoFactory = () => Promise<Repository>;

let override: RepoFactory | null = null;

/** Tests call this before invoking a server action to inject InMemoryRepository. */
export function __setRepoFactoryForTests(factory: RepoFactory | null): void {
  override = factory;
}

export async function getRepo(): Promise<Repository> {
  if (override) return override();
  const user = await createServerSupabase();
  const admin = createAdminSupabase();
  return new SupabaseRepository({ user, admin });
}
