import { createServerSupabase } from '@/lib/supabase/server';
import type { Player } from '@/lib/domain/types';
import { SupabaseRepository } from '@/lib/repositories/supabase-repository';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type Session = Readonly<{
  userId: string;
  email: string | null;
  displayName: string;
  player: Player;
}>;

export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    user.email?.split('@')[0] ||
    'Jugador';
  // Google returns the profile picture under either key; grab whichever is present.
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;

  const repo = new SupabaseRepository({ user: supabase, admin: createAdminSupabase() });
  const player = await repo.ensurePlayerForProfile(user.id, displayName, avatarUrl);
  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: player.displayName,
    player,
  };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error('NOT_AUTHORIZED');
  return s;
}
