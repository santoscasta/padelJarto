export type TournamentStatus = 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
export type PairingMode = 'pre_inscribed' | 'draw' | 'mixed' | 'owner_picks';
export type MatchPhase = 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';
export type ResultStatus = 'reported' | 'validated' | 'disputed' | 'walkover' | 'corrected';
export type InscriptionStatus = 'pending' | 'confirmed';
export type NotificationKind =
  | 'inscription_new'
  | 'tournament_open'
  | 'tournament_started'
  | 'result_reported'
  | 'result_validated';

export type SetScore = Readonly<{ a: number; b: number }>;

export type Player = Readonly<{
  id: string;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  matchesPlayed: number;
}>;

export type Pair = Readonly<{
  id: string;
  playerAId: string;
  playerBId: string;
  rating: number;
  displayName: string | null;
}>;

export type Tournament = Readonly<{
  id: string;
  ownerId: string;
  name: string;
  status: TournamentStatus;
  pairingMode: PairingMode;
  size: number;
  groupCount: number;
  playoffCutoff: number;
  startsAt: string | null;
  createdAt: string;
}>;

export type Inscription = Readonly<{
  id: string;
  tournamentId: string;
  playerId: string;
  pairId: string | null;
  status: InscriptionStatus;
}>;

export type Invitation = Readonly<{
  id: string;
  tournamentId: string;
  token: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}>;

export type Group = Readonly<{
  id: string;
  tournamentId: string;
  label: string;
  pairIds: ReadonlyArray<string>;
}>;

export type Match = Readonly<{
  id: string;
  tournamentId: string;
  phase: MatchPhase;
  groupId: string | null;
  pairAId: string;
  pairBId: string;
  court: string | null;
  scheduledAt: string | null;
}>;

export type Result = Readonly<{
  id: string;
  matchId: string;
  sets: ReadonlyArray<SetScore>;
  winnerPairId: string;
  reportedBy: string;
  validatedBy: string | null;
  validatedAt: string | null;
  status: ResultStatus;
  correctsResultId: string | null;
}>;

export type RatingSnapshot = Readonly<{
  id: string;
  subjectType: 'player' | 'pair';
  subjectId: string;
  before: number;
  after: number;
  delta: number;
  matchId: string;
  resultId: string;
  createdAt: string;
}>;

export type Notification = Readonly<{
  id: string;
  userId: string;
  kind: NotificationKind;
  payload: Readonly<Record<string, unknown>>;
  readAt: string | null;
  createdAt: string;
}>;
