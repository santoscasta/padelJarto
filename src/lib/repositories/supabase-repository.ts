import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Group,
  Inscription,
  Invitation,
  Match,
  Notification,
  Pair,
  Player,
  RatingSnapshot,
  Result,
  Tournament,
  TournamentStatus,
} from '@/lib/domain/types';
import type {
  NewInscriptionInput,
  NewTournamentInput,
  Repository,
  ValidateResultInput,
} from './types';

type Clients = Readonly<{ user: SupabaseClient; admin: SupabaseClient }>;

// The Supabase JS client returns rows as loosely-typed objects for dynamic
// queries. Typing each mapper input with a full database schema duplicates
// the Postgres definitions without adding safety — the narrowing inside each
// mapper (coercing to Number, string fields) is the real boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseRow = any;

export class SupabaseRepository implements Repository {
  constructor(private readonly clients: Clients) {}

  private get db(): SupabaseClient { return this.clients.user; }
  private get admin(): SupabaseClient { return this.clients.admin; }

  // ---------- players ----------
  async getPlayerByProfileId(profileId: string): Promise<Player | null> {
    const { data, error } = await this.db
      .from('players')
      .select('id, profile_id, rating, matches_played, profiles(display_name, avatar_url)')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapPlayer(data);
  }

  async ensurePlayerForProfile(
    profileId: string,
    displayName: string,
    avatarUrl?: string | null,
  ): Promise<Player> {
    // Display name + avatar are seeded on signup via the handle_new_auth_user
    // trigger (reading Google metadata). After signup, only the user can edit
    // them via /app/me/edit — we do NOT overwrite on every login, otherwise a
    // custom name/photo would be wiped the next time the Google avatar URL
    // rotated.
    const existing = await this.getPlayerByProfileId(profileId);
    if (existing) return existing;

    // Defensive fallback: if the trigger didn't run (historical data), create
    // the player row ourselves using the seed values from the auth metadata.
    const { data, error } = await this.admin
      .from('players')
      .insert({ profile_id: profileId })
      .select('id, profile_id, rating, matches_played, profiles(display_name, avatar_url)')
      .single();
    if (error) throw error;
    return mapPlayer({
      ...data,
      profiles: { display_name: displayName, avatar_url: avatarUrl ?? null },
    });
  }

  async listPlayers(): Promise<ReadonlyArray<Player>> {
    const { data, error } = await this.db
      .from('players')
      .select('id, profile_id, rating, matches_played, profiles(display_name, avatar_url)')
      .order('rating', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapPlayer);
  }

  async getPlayer(id: string): Promise<Player | null> {
    const { data, error } = await this.db
      .from('players')
      .select('id, profile_id, rating, matches_played, profiles(display_name, avatar_url)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPlayer(data) : null;
  }

  async updateMyProfile(
    profileId: string,
    patch: Readonly<{ displayName?: string; avatarUrl?: string | null }>,
  ): Promise<Player> {
    const row: Record<string, unknown> = {};
    if (patch.displayName !== undefined) {
      const trimmed = patch.displayName.trim();
      if (trimmed.length === 0) throw new Error('DISPLAY_NAME_EMPTY');
      row.display_name = trimmed;
    }
    if (patch.avatarUrl !== undefined) {
      // Allow null to clear. Trim stray whitespace from pasted URLs.
      row.avatar_url = patch.avatarUrl === null ? null : patch.avatarUrl.trim();
    }
    if (Object.keys(row).length === 0) {
      // Nothing to patch — just return current state.
      const current = await this.getPlayerByProfileId(profileId);
      if (!current) throw new Error('PROFILE_NOT_FOUND');
      return current;
    }
    // Goes through the user-authenticated client so profiles_self_update RLS
    // (auth.uid() = id) enforces that only the owner can write.
    const { error: updateError } = await this.db
      .from('profiles')
      .update(row)
      .eq('id', profileId);
    if (updateError) throw updateError;

    const refreshed = await this.getPlayerByProfileId(profileId);
    if (!refreshed) throw new Error('PROFILE_NOT_FOUND');
    return refreshed;
  }

  // ---------- pairs ----------
  async upsertPair(playerAId: string, playerBId: string): Promise<Pair> {
    const [a, b] = playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
    const { data: existing } = await this.db
      .from('pairs')
      .select('id, player_a_id, player_b_id, rating, display_name')
      .eq('player_a_id', a)
      .eq('player_b_id', b)
      .maybeSingle();
    if (existing) return mapPair(existing);
    const { data, error } = await this.admin
      .from('pairs')
      .insert({ player_a_id: a, player_b_id: b })
      .select('id, player_a_id, player_b_id, rating, display_name')
      .single();
    if (error) throw error;
    return mapPair(data);
  }

  async getPair(id: string): Promise<Pair | null> {
    const { data, error } = await this.db
      .from('pairs')
      .select('id, player_a_id, player_b_id, rating, display_name')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPair(data) : null;
  }

  async listPairsForTournament(tournamentId: string): Promise<ReadonlyArray<Pair>> {
    const { data, error } = await this.db
      .from('inscriptions')
      .select('pair:pair_id(id, player_a_id, player_b_id, rating, display_name)')
      .eq('tournament_id', tournamentId)
      .not('pair_id', 'is', null);
    if (error) throw error;
    const pairs = (data ?? []).map((row) => row.pair).filter(Boolean) as SupabaseRow[];
    const seen = new Set<string>();
    const unique: Pair[] = [];
    for (const p of pairs) {
      if (!seen.has(p.id)) { seen.add(p.id); unique.push(mapPair(p)); }
    }
    return unique;
  }

  async listPairsRanked(limit = 100): Promise<ReadonlyArray<Pair>> {
    const { data, error } = await this.db
      .from('pairs')
      .select('id, player_a_id, player_b_id, rating, display_name')
      .order('rating', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapPair);
  }

  async updatePairDisplayName(
    pairId: string,
    displayName: string | null,
  ): Promise<Pair> {
    // Use the user-authenticated client so the RLS policy
    // `pairs_member_update` enforces that only one of the two pair members
    // can write. Server actions validate input length before calling this.
    const trimmed =
      typeof displayName === 'string' ? displayName.trim() : displayName;
    const normalized = trimmed && trimmed.length > 0 ? trimmed : null;
    const { data, error } = await this.db
      .from('pairs')
      .update({ display_name: normalized })
      .eq('id', pairId)
      .select('id, player_a_id, player_b_id, rating, display_name')
      .single();
    if (error) throw error;
    return mapPair(data);
  }

  // ---------- tournaments ----------
  async createTournament(input: NewTournamentInput): Promise<Tournament> {
    const { data, error } = await this.db
      .from('tournaments')
      .insert({
        owner_id: input.ownerId,
        name: input.name,
        pairing_mode: input.pairingMode,
        size: input.size,
        group_count: input.groupCount,
        playoff_cutoff: input.playoffCutoff,
        starts_at: input.startsAt,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapTournament(data);
  }

  async getTournament(id: string): Promise<Tournament | null> {
    const { data, error } = await this.db
      .from('tournaments').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTournament(data) : null;
  }

  async getTournamentPublic(id: string): Promise<Tournament | null> {
    const { data, error } = await this.admin
      .from('tournaments').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTournament(data) : null;
  }

  async listTournaments(): Promise<ReadonlyArray<Tournament>> {
    const { data, error } = await this.db
      .from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTournament);
  }

  async updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament> {
    const { data, error } = await this.db
      .from('tournaments').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTournament(data);
  }

  async updateTournamentPairingMode(
    id: string,
    pairingMode: Tournament['pairingMode'],
  ): Promise<Tournament> {
    const { data, error } = await this.db
      .from('tournaments')
      .update({ pairing_mode: pairingMode })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapTournament(data);
  }

  // ---------- inscriptions ----------
  async createInscription(input: NewInscriptionInput): Promise<Inscription> {
    const { data, error } = await this.db
      .from('inscriptions')
      .insert({
        tournament_id: input.tournamentId,
        player_id: input.playerId,
        pair_id: input.pairId,
        status: input.pairId ? 'confirmed' : 'pending',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapInscription(data);
  }

  async listInscriptions(tournamentId: string): Promise<ReadonlyArray<Inscription>> {
    const { data, error } = await this.db
      .from('inscriptions').select('*').eq('tournament_id', tournamentId);
    if (error) throw error;
    return (data ?? []).map(mapInscription);
  }

  async setInscriptionPair(
    tournamentId: string,
    playerId: string,
    pairId: string | null,
  ): Promise<Inscription> {
    const { data, error } = await this.admin
      .from('inscriptions')
      .update({ pair_id: pairId, status: pairId ? 'confirmed' : 'pending' })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)
      .select('*')
      .single();
    if (error) throw error;
    return mapInscription(data);
  }

  // ---------- invitations ----------
  async createInvitation(
    tournamentId: string, token: string, expiresAt: string, createdBy: string,
  ): Promise<Invitation> {
    const { data, error } = await this.db
      .from('invitations')
      .insert({ tournament_id: tournamentId, token, expires_at: expiresAt, created_by: createdBy })
      .select('*').single();
    if (error) throw error;
    return mapInvitation(data);
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await this.admin
      .from('invitations').select('*').eq('token', token).maybeSingle();
    if (error) throw error;
    return data ? mapInvitation(data) : null;
  }

  // ---------- groups + matches ----------
  async createGroups(groups: ReadonlyArray<Group>): Promise<ReadonlyArray<Group>> {
    // The domain layer hands us synthetic string IDs (e.g. "group-<tid>-A"),
    // but `groups.id` is a uuid column with a default. Drop the synthetic id
    // so Postgres generates a UUID, then map the returned rows back to our
    // domain Groups and use those real UUIDs when inserting group_pairs.
    const groupRows = groups.map((g) => ({ tournament_id: g.tournamentId, label: g.label }));
    const { data: inserted, error: gErr } = await this.db
      .from('groups')
      .insert(groupRows)
      .select('id, tournament_id, label');
    if (gErr) throw gErr;
    const insertedByLabel = new Map<string, SupabaseRow>(
      (inserted ?? []).map((row: SupabaseRow) => [row.label, row]),
    );
    const persisted: Group[] = groups.map((g) => {
      const row = insertedByLabel.get(g.label);
      if (!row) throw new Error(`Group insert did not return row for label ${g.label}`);
      return { id: row.id, tournamentId: row.tournament_id, label: row.label, pairIds: g.pairIds };
    });
    const gpRows = persisted.flatMap((g) =>
      g.pairIds.map((pid) => ({ group_id: g.id, pair_id: pid })),
    );
    if (gpRows.length) {
      const { error: pErr } = await this.db.from('group_pairs').insert(gpRows);
      if (pErr) throw pErr;
    }
    return persisted;
  }

  async listGroups(tournamentId: string): Promise<ReadonlyArray<Group>> {
    const { data, error } = await this.db
      .from('groups')
      .select('id, tournament_id, label, group_pairs(pair_id)')
      .eq('tournament_id', tournamentId)
      .order('label', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((g: SupabaseRow) => ({
      id: g.id,
      tournamentId: g.tournament_id,
      label: g.label,
      pairIds: (g.group_pairs ?? []).map((r: { pair_id: string }) => r.pair_id),
    }));
  }

  async createMatches(matches: ReadonlyArray<Match>): Promise<ReadonlyArray<Match>> {
    if (matches.length === 0) return matches;
    // Synthetic IDs from the domain layer are not valid uuids; let Postgres
    // generate them via the column default and return the persisted rows.
    const rows = matches.map((m) => ({
      tournament_id: m.tournamentId, phase: m.phase, group_id: m.groupId,
      pair_a_id: m.pairAId, pair_b_id: m.pairBId, court: m.court, scheduled_at: m.scheduledAt,
    }));
    const { data, error } = await this.db.from('matches').insert(rows).select('*');
    if (error) throw error;
    return (data ?? []).map(mapMatch);
  }

  async getMatch(id: string): Promise<Match | null> {
    const { data, error } = await this.db.from('matches').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapMatch(data) : null;
  }

  async listMatches(tournamentId: string): Promise<ReadonlyArray<Match>> {
    const { data, error } = await this.db
      .from('matches').select('*').eq('tournament_id', tournamentId);
    if (error) throw error;
    return (data ?? []).map(mapMatch);
  }

  // ---------- results ----------
  async reportResult(r: Omit<Result, 'id' | 'validatedBy' | 'validatedAt'>): Promise<Result> {
    const { data, error } = await this.db
      .from('results')
      .insert({
        match_id: r.matchId,
        sets: r.sets,
        winner_pair_id: r.winnerPairId,
        reported_by: r.reportedBy,
        status: 'reported',
        corrects_result_id: r.correctsResultId,
      })
      .select('*').single();
    if (error) throw error;
    return mapResult(data);
  }

  async getResultForMatch(matchId: string): Promise<Result | null> {
    const { data, error } = await this.db
      .from('results')
      .select('*')
      .eq('match_id', matchId)
      .neq('status', 'corrected')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapResult(data) : null;
  }

  async validateResult(input: ValidateResultInput): Promise<Result> {
    // Use admin client so we can atomically write snapshots + updates.
    const admin = this.admin;
    const { data: result, error: upErr } = await admin
      .from('results')
      .update({
        status: 'validated',
        validated_by: input.validatorId,
        validated_at: input.validatedAt,
      })
      .eq('id', input.resultId)
      .select('*').single();
    if (upErr) throw upErr;

    if (input.snapshots.length) {
      const rows = input.snapshots.map((s) => ({
        id: s.id, subject_type: s.subjectType, subject_id: s.subjectId,
        before: s.before, after: s.after, delta: s.delta,
        match_id: s.matchId, result_id: s.resultId, created_at: s.createdAt,
      }));
      const { error: sErr } = await admin.from('rating_snapshots').insert(rows);
      if (sErr) throw sErr;
    }
    for (const [pid, rating] of Object.entries(input.newPlayerRatings)) {
      const { error } = await admin.rpc('increment_matches_and_set_rating', {
        p_player_id: pid, p_rating: rating,
      });
      if (error) throw error;
    }
    for (const [pid, rating] of Object.entries(input.newPairRatings)) {
      const { error } = await admin.from('pairs').update({ rating }).eq('id', pid);
      if (error) throw error;
    }
    return mapResult(result);
  }

  async correctResult(
    original: Result,
    replacement: Omit<Result, 'id' | 'correctsResultId' | 'status'>,
  ): Promise<Result> {
    const admin = this.admin;
    const { error: upErr } = await admin
      .from('results').update({ status: 'corrected' }).eq('id', original.id);
    if (upErr) throw upErr;
    const { data, error } = await admin
      .from('results')
      .insert({
        match_id: replacement.matchId,
        sets: replacement.sets,
        winner_pair_id: replacement.winnerPairId,
        reported_by: replacement.reportedBy,
        status: 'reported',
        corrects_result_id: original.id,
      })
      .select('*').single();
    if (error) throw error;
    return mapResult(data);
  }

  // ---------- snapshots ----------
  async listRatingSnapshotsForSubject(
    subjectType: 'player' | 'pair',
    subjectId: string,
  ): Promise<ReadonlyArray<RatingSnapshot>> {
    const { data, error } = await this.db
      .from('rating_snapshots')
      .select('*')
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSnapshot);
  }

  // ---------- notifications ----------
  async createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification> {
    const { data, error } = await this.admin
      .from('notifications')
      .insert({ user_id: n.userId, kind: n.kind, payload: n.payload })
      .select('*').single();
    if (error) throw error;
    return mapNotification(data);
  }

  async listNotifications(userId: string): Promise<ReadonlyArray<Notification>> {
    const { data, error } = await this.db
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapNotification);
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }
}

// ---------- mappers ----------
function mapPlayer(row: SupabaseRow): Player {
  return {
    id: row.id,
    profileId: row.profile_id,
    displayName: row.profiles?.display_name ?? 'Jugador',
    avatarUrl: row.profiles?.avatar_url ?? null,
    rating: Number(row.rating),
    matchesPlayed: Number(row.matches_played),
  };
}
function mapPair(row: SupabaseRow): Pair {
  const raw = typeof row.display_name === 'string' ? row.display_name.trim() : '';
  return {
    id: row.id,
    playerAId: row.player_a_id,
    playerBId: row.player_b_id,
    rating: Number(row.rating),
    displayName: raw.length > 0 ? raw : null,
  };
}
function mapTournament(row: SupabaseRow): Tournament {
  return {
    id: row.id, ownerId: row.owner_id, name: row.name, status: row.status,
    pairingMode: row.pairing_mode, size: row.size,
    groupCount: row.group_count, playoffCutoff: row.playoff_cutoff,
    startsAt: row.starts_at, createdAt: row.created_at,
  };
}
function mapInscription(row: SupabaseRow): Inscription {
  return {
    id: row.id, tournamentId: row.tournament_id, playerId: row.player_id,
    pairId: row.pair_id, status: row.status,
  };
}
function mapInvitation(row: SupabaseRow): Invitation {
  return {
    id: row.id, tournamentId: row.tournament_id, token: row.token,
    expiresAt: row.expires_at, createdBy: row.created_by, createdAt: row.created_at,
  };
}
function mapMatch(row: SupabaseRow): Match {
  return {
    id: row.id, tournamentId: row.tournament_id, phase: row.phase,
    groupId: row.group_id, pairAId: row.pair_a_id, pairBId: row.pair_b_id,
    court: row.court, scheduledAt: row.scheduled_at,
  };
}
function mapResult(row: SupabaseRow): Result {
  return {
    id: row.id, matchId: row.match_id, sets: row.sets,
    winnerPairId: row.winner_pair_id, reportedBy: row.reported_by,
    validatedBy: row.validated_by, validatedAt: row.validated_at,
    status: row.status, correctsResultId: row.corrects_result_id,
  };
}
function mapSnapshot(row: SupabaseRow): RatingSnapshot {
  return {
    id: row.id, subjectType: row.subject_type, subjectId: row.subject_id,
    before: Number(row.before), after: Number(row.after), delta: Number(row.delta),
    matchId: row.match_id, resultId: row.result_id, createdAt: row.created_at,
  };
}
function mapNotification(row: SupabaseRow): Notification {
  return {
    id: row.id, userId: row.user_id, kind: row.kind, payload: row.payload ?? {},
    readAt: row.read_at, createdAt: row.created_at,
  };
}
