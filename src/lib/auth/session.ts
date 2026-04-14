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

  const repo = new SupabaseRepository({ user: supabase, admin: createAdminSupabase() });
  const player = await repo.ensurePlayerForProfile(
    user.id,
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Jugador',
  );
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
