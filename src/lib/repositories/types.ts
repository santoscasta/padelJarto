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

export type NewTournamentInput = Readonly<{
  ownerId: string;
  name: string;
  pairingMode: Tournament['pairingMode'];
  size: number;
  groupCount: number;
  playoffCutoff: number;
  startsAt: string | null;
}>;

export type NewInscriptionInput = Readonly<{
  tournamentId: string;
  playerId: string;
  pairId: string | null;
}>;

export type ValidateResultInput = Readonly<{
  resultId: string;
  matchId: string;
  validatorId: string;
  validatedAt: string;
  snapshots: ReadonlyArray<RatingSnapshot>;
  newPlayerRatings: Readonly<Record<string, number>>;
  newPairRatings: Readonly<Record<string, number>>;
}>;

export interface Repository {
  // profiles / players
  getPlayerByProfileId(profileId: string): Promise<Player | null>;
  ensurePlayerForProfile(profileId: string, displayName: string): Promise<Player>;
  listPlayers(): Promise<ReadonlyArray<Player>>;
  getPlayer(id: string): Promise<Player | null>;

  // pairs
  upsertPair(playerAId: string, playerBId: string): Promise<Pair>;
  getPair(id: string): Promise<Pair | null>;
  listPairsForTournament(tournamentId: string): Promise<ReadonlyArray<Pair>>;
  listPairsRanked(limit?: number): Promise<ReadonlyArray<Pair>>;

  // tournaments
  createTournament(input: NewTournamentInput): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | null>;
  listTournaments(): Promise<ReadonlyArray<Tournament>>;
  updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament>;
  updateTournamentPairingMode(id: string, pairingMode: Tournament['pairingMode']): Promise<Tournament>;

  // inscriptions
  createInscription(input: NewInscriptionInput): Promise<Inscription>;
  listInscriptions(tournamentId: string): Promise<ReadonlyArray<Inscription>>;

  // invitations
  createInvitation(tournamentId: string, token: string, expiresAt: string, createdBy: string): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | null>;

  // groups
  createGroups(groups: ReadonlyArray<Group>): Promise<ReadonlyArray<Group>>;
  listGroups(tournamentId: string): Promise<ReadonlyArray<Group>>;

  // matches
  createMatches(matches: ReadonlyArray<Match>): Promise<ReadonlyArray<Match>>;
  getMatch(id: string): Promise<Match | null>;
  listMatches(tournamentId: string): Promise<ReadonlyArray<Match>>;

  // results
  reportResult(result: Omit<Result, 'id' | 'validatedBy' | 'validatedAt'>): Promise<Result>;
  getResultForMatch(matchId: string): Promise<Result | null>;
  validateResult(input: ValidateResultInput): Promise<Result>;
  correctResult(original: Result, replacement: Omit<Result, 'id' | 'correctsResultId' | 'status'>): Promise<Result>;

  // rating snapshots
  listRatingSnapshotsForSubject(subjectType: 'player' | 'pair', subjectId: string): Promise<ReadonlyArray<RatingSnapshot>>;

  // notifications
  createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification>;
  listNotifications(userId: string): Promise<ReadonlyArray<Notification>>;
  markNotificationRead(id: string, userId: string): Promise<void>;
}
