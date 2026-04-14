import { randomUUID } from 'node:crypto';
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
import { ELO_BASE } from '@/lib/utils/constants';
import type {
  NewInscriptionInput,
  NewTournamentInput,
  Repository,
  ValidateResultInput,
} from './types';

function now(): string {
  return new Date().toISOString();
}

export class InMemoryRepository implements Repository {
  private players = new Map<string, Player>();
  private profiles = new Map<string, string>();                // profileId → playerId
  private pairs = new Map<string, Pair>();
  private pairByKey = new Map<string, string>();               // "a:b" (sorted) → pairId
  private tournaments = new Map<string, Tournament>();
  private inscriptions = new Map<string, Inscription>();
  private invitations = new Map<string, Invitation>();
  private invitationByToken = new Map<string, string>();
  private groups = new Map<string, Group>();
  private matches = new Map<string, Match>();
  private results = new Map<string, Result>();                 // resultId → Result
  private activeResultByMatch = new Map<string, string>();     // matchId → resultId (non-corrected)
  private snapshots: RatingSnapshot[] = [];
  private notifications: Notification[] = [];

  // -- utility seeding --
  seedPlayers(players: ReadonlyArray<Player>): void {
    for (const p of players) {
      this.players.set(p.id, p);
      this.profiles.set(p.profileId, p.id);
    }
  }

  // -- players --
  async getPlayerByProfileId(profileId: string): Promise<Player | null> {
    const id = this.profiles.get(profileId);
    return id ? this.players.get(id) ?? null : null;
  }
  async ensurePlayerForProfile(profileId: string, displayName: string): Promise<Player> {
    const existing = await this.getPlayerByProfileId(profileId);
    if (existing) return existing;
    const p: Player = {
      id: randomUUID(), profileId, displayName, rating: ELO_BASE, matchesPlayed: 0,
    };
    this.players.set(p.id, p);
    this.profiles.set(profileId, p.id);
    return p;
  }
  async listPlayers(): Promise<ReadonlyArray<Player>> {
    return [...this.players.values()].sort((a, b) => b.rating - a.rating);
  }
  async getPlayer(id: string): Promise<Player | null> {
    return this.players.get(id) ?? null;
  }

  // -- pairs --
  async upsertPair(playerAId: string, playerBId: string): Promise<Pair> {
    const [a, b] = playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
    const key = `${a}:${b}`;
    const existingId = this.pairByKey.get(key);
    if (existingId) return this.pairs.get(existingId)!;
    const pair: Pair = { id: randomUUID(), playerAId: a, playerBId: b, rating: ELO_BASE };
    this.pairs.set(pair.id, pair);
    this.pairByKey.set(key, pair.id);
    return pair;
  }
  async getPair(id: string): Promise<Pair | null> {
    return this.pairs.get(id) ?? null;
  }
  async listPairsForTournament(tournamentId: string): Promise<ReadonlyArray<Pair>> {
    const ids = new Set<string>();
    for (const i of this.inscriptions.values()) {
      if (i.tournamentId === tournamentId && i.pairId) ids.add(i.pairId);
    }
    return [...ids].map((id) => this.pairs.get(id)).filter((p): p is Pair => !!p);
  }
  async listPairsRanked(limit = 100): Promise<ReadonlyArray<Pair>> {
    return [...this.pairs.values()].sort((a, b) => b.rating - a.rating).slice(0, limit);
  }

  // -- tournaments --
  async createTournament(input: NewTournamentInput): Promise<Tournament> {
    const t: Tournament = {
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      status: 'draft',
      pairingMode: input.pairingMode,
      size: input.size,
      groupCount: input.groupCount,
      playoffCutoff: input.playoffCutoff,
      startsAt: input.startsAt,
      createdAt: now(),
    };
    this.tournaments.set(t.id, t);
    return t;
  }
  async getTournament(id: string): Promise<Tournament | null> {
    return this.tournaments.get(id) ?? null;
  }
  async listTournaments(): Promise<ReadonlyArray<Tournament>> {
    return [...this.tournaments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament> {
    const t = this.tournaments.get(id);
    if (!t) throw new Error(`Tournament ${id} not found`);
    const next = { ...t, status };
    this.tournaments.set(id, next);
    return next;
  }

  // -- inscriptions --
  async createInscription(input: NewInscriptionInput): Promise<Inscription> {
    for (const i of this.inscriptions.values()) {
      if (i.tournamentId === input.tournamentId && i.playerId === input.playerId) {
        throw new Error('CONFLICT: already inscribed');
      }
    }
    const ins: Inscription = {
      id: randomUUID(),
      tournamentId: input.tournamentId,
      playerId: input.playerId,
      pairId: input.pairId,
      status: input.pairId ? 'confirmed' : 'pending',
    };
    this.inscriptions.set(ins.id, ins);
    return ins;
  }
  async listInscriptions(tournamentId: string): Promise<ReadonlyArray<Inscription>> {
    return [...this.inscriptions.values()].filter((i) => i.tournamentId === tournamentId);
  }

  // -- invitations --
  async createInvitation(tournamentId: string, token: string, expiresAt: string, createdBy: string): Promise<Invitation> {
    const inv: Invitation = {
      id: randomUUID(), tournamentId, token, expiresAt, createdBy, createdAt: now(),
    };
    this.invitations.set(inv.id, inv);
    this.invitationByToken.set(token, inv.id);
    return inv;
  }
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const id = this.invitationByToken.get(token);
    return id ? this.invitations.get(id) ?? null : null;
  }

  // -- groups + matches --
  async createGroups(groups: ReadonlyArray<Group>): Promise<ReadonlyArray<Group>> {
    for (const g of groups) this.groups.set(g.id, g);
    return groups;
  }
  async listGroups(tournamentId: string): Promise<ReadonlyArray<Group>> {
    return [...this.groups.values()].filter((g) => g.tournamentId === tournamentId);
  }
  async createMatches(matches: ReadonlyArray<Match>): Promise<ReadonlyArray<Match>> {
    for (const m of matches) this.matches.set(m.id, m);
    return matches;
  }
  async getMatch(id: string): Promise<Match | null> {
    return this.matches.get(id) ?? null;
  }
  async listMatches(tournamentId: string): Promise<ReadonlyArray<Match>> {
    return [...this.matches.values()].filter((m) => m.tournamentId === tournamentId);
  }

  // -- results --
  async reportResult(r: Omit<Result, 'id' | 'validatedBy' | 'validatedAt'>): Promise<Result> {
    if (this.activeResultByMatch.has(r.matchId)) {
      throw new Error('CONFLICT: result already reported');
    }
    const full: Result = { ...r, id: randomUUID(), validatedBy: null, validatedAt: null };
    this.results.set(full.id, full);
    this.activeResultByMatch.set(full.matchId, full.id);
    return full;
  }
  async getResultForMatch(matchId: string): Promise<Result | null> {
    const id = this.activeResultByMatch.get(matchId);
    return id ? this.results.get(id) ?? null : null;
  }
  async validateResult(input: ValidateResultInput): Promise<Result> {
    const r = this.results.get(input.resultId);
    if (!r) throw new Error('NOT_FOUND: result');
    if (r.status === 'validated') throw new Error('RESULT_ALREADY_VALIDATED');
    const validated: Result = {
      ...r,
      status: 'validated',
      validatedBy: input.validatorId,
      validatedAt: input.validatedAt,
    };
    this.results.set(r.id, validated);
    this.snapshots.push(...input.snapshots);
    for (const [pid, rating] of Object.entries(input.newPlayerRatings)) {
      const p = this.players.get(pid);
      if (p) this.players.set(pid, { ...p, rating, matchesPlayed: p.matchesPlayed + 1 });
    }
    for (const [pid, rating] of Object.entries(input.newPairRatings)) {
      const p = this.pairs.get(pid);
      if (p) this.pairs.set(pid, { ...p, rating });
    }
    return validated;
  }
  async correctResult(
    original: Result,
    replacement: Omit<Result, 'id' | 'correctsResultId' | 'status'>,
  ): Promise<Result> {
    const correctedOriginal: Result = { ...original, status: 'corrected' };
    this.results.set(original.id, correctedOriginal);
    const fresh: Result = {
      ...replacement,
      id: randomUUID(),
      correctsResultId: original.id,
      status: 'reported',
    };
    this.results.set(fresh.id, fresh);
    this.activeResultByMatch.set(fresh.matchId, fresh.id);
    return fresh;
  }

  // -- snapshots --
  async listRatingSnapshotsForSubject(
    subjectType: 'player' | 'pair',
    subjectId: string,
  ): Promise<ReadonlyArray<RatingSnapshot>> {
    return this.snapshots
      .filter((s) => s.subjectType === subjectType && s.subjectId === subjectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // -- notifications --
  async createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification> {
    const full: Notification = { ...n, id: randomUUID(), createdAt: now(), readAt: null };
    this.notifications.push(full);
    return full;
  }
  async listNotifications(userId: string): Promise<ReadonlyArray<Notification>> {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async markNotificationRead(id: string, userId: string): Promise<void> {
    const i = this.notifications.findIndex((n) => n.id === id && n.userId === userId);
    if (i >= 0) this.notifications[i] = { ...this.notifications[i], readAt: now() };
  }
}
