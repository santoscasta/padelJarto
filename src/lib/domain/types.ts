export type AppRole = "organizer" | "player";
export type TournamentMode = "fixed_pairs" | "individual_ranking";
export type TournamentStatus = "draft" | "live" | "completed";
export type StageType = "groups" | "knockout";
export type MatchStatus = "draft" | "scheduled" | "pending_review" | "validated";
export type InvitationStatus = "pending" | "accepted" | "revoked";
export type MembershipStatus = "invited" | "accepted";
export type ScoreSubmissionStatus = "pending_review" | "validated" | "rejected";
export type StandingsEntityType = "team" | "player";

export interface TournamentRules {
  bestOfSets: number;
  setsToWin: number;
  tiebreakAt: number;
}

export interface TournamentConfig {
  groupCount: number;
  qualifiersPerGroup: number;
  knockoutSize: number;
  scheduleGeneration: "automatic_with_editing";
  individualPairingMode: "mixed";
  rules: TournamentRules;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  status: TournamentStatus;
  visibility: "private";
  mode: TournamentMode;
  organizerId: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  createdAt: string;
  config: TournamentConfig;
}

export interface TournamentMembership {
  id: string;
  tournamentId: string;
  userId: string;
  role: AppRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  tournamentId: string;
  token: string;
  invitedEmail?: string | null;
  status: InvitationStatus;
  createdBy: string;
  createdAt: string;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
}

export interface Stage {
  id: string;
  tournamentId: string;
  type: StageType;
  name: string;
  sequence: number;
  config?: Record<string, unknown> | null;
}

export interface Group {
  id: string;
  stageId: string;
  tournamentId: string;
  name: string;
  slot: number;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  seed?: number | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  stageId: string;
  groupId?: string | null;
  roundLabel?: string | null;
  bracketRound?: number | null;
  bracketPosition?: number | null;
  status: MatchStatus;
  scheduledAt?: string | null;
  court?: string | null;
  validatedSubmissionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchSide {
  id: string;
  matchId: string;
  side: "home" | "away";
  teamId?: string | null;
  playerIds: string[];
}

export interface ScoreSet {
  home: number;
  away: number;
  tiebreakHome?: number | null;
  tiebreakAway?: number | null;
}

export interface ScoreSubmission {
  id: string;
  matchId: string;
  sets: ScoreSet[];
  status: ScoreSubmissionStatus;
  submittedBy: string;
  createdAt: string;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface StandingRow {
  id: string;
  tournamentId: string;
  stageId: string;
  groupId?: string | null;
  entityType: StandingsEntityType;
  entityId: string;
  rank: number;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
}

export interface MatchWithContext extends Match {
  sides: [MatchSide, MatchSide];
  latestSubmission?: ScoreSubmission | null;
  validatedSubmission?: ScoreSubmission | null;
}

export interface GroupView {
  group: Group;
  standings: StandingRow[];
  matches: MatchWithContext[];
}

export interface KnockoutRoundView {
  round: number;
  label: string;
  matches: MatchWithContext[];
}

export interface TournamentDetail {
  tournament: Tournament;
  membership: TournamentMembership;
  members: Profile[];
  invitations: Invitation[];
  teams: Team[];
  teamMembers: TeamMember[];
  stages: Stage[];
  groups: GroupView[];
  knockoutRounds: KnockoutRoundView[];
  matches: MatchWithContext[];
  pendingSubmissions: ScoreSubmission[];
  standings: StandingRow[];
}

export interface DashboardTournamentSummary {
  tournament: Tournament;
  membership: TournamentMembership;
  pendingPlayerMatches: number;
  pendingReviewCount: number;
}

export interface DashboardSnapshot {
  currentUser: Profile;
  tournaments: DashboardTournamentSummary[];
  invitations: Invitation[];
}

export interface TournamentBundle {
  tournament: Tournament;
  memberships: TournamentMembership[];
  invitations: Invitation[];
  profiles: Profile[];
  teams: Team[];
  teamMembers: TeamMember[];
  stages: Stage[];
  groups: Group[];
  matches: Match[];
  matchSides: MatchSide[];
  scoreSubmissions: ScoreSubmission[];
  standings?: StandingRow[];
}

export interface CreateTournamentInput {
  name: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  mode: TournamentMode;
  groupCount: number;
  qualifiersPerGroup: number;
  knockoutSize: number;
}

export interface CreateInvitationInput {
  tournamentId: string;
  invitedEmail?: string;
}

export interface CreateTeamInput {
  tournamentId: string;
  name: string;
  playerIds: [string, string];
}

export interface UpdateMatchInput {
  tournamentId: string;
  matchId: string;
  scheduledAt?: string;
  court?: string;
}

export interface UpdateIndividualPairingInput {
  tournamentId: string;
  matchId: string;
  homePlayerIds: [string, string];
  awayPlayerIds: [string, string];
}

export interface SubmitScoreInput {
  tournamentId: string;
  matchId: string;
  notes?: string;
  sets: ScoreSet[];
}

export interface ReviewSubmissionInput {
  tournamentId: string;
  submissionId: string;
  nextStatus: Extract<ScoreSubmissionStatus, "validated" | "rejected">;
}

export interface IndividualKnockoutPair {
  label: string;
  playerIds: [string, string];
}

export interface ConfigureIndividualKnockoutInput {
  tournamentId: string;
  pairs: IndividualKnockoutPair[];
}

export interface TournamentRepository {
  ensureProfile(profile: Profile): Promise<void>;
  getDashboard(userId: string): Promise<DashboardSnapshot>;
  getInvitationByToken(token: string): Promise<Invitation | null>;
  acceptInvitation(token: string, profile: Profile): Promise<string>;
  createTournament(input: CreateTournamentInput, organizer: Profile): Promise<Tournament>;
  createInvitation(input: CreateInvitationInput, organizerId: string): Promise<Invitation>;
  getTournamentDetail(tournamentId: string, userId: string): Promise<TournamentDetail | null>;
  createTeam(input: CreateTeamInput, organizerId: string): Promise<void>;
  generateGroupStage(tournamentId: string, organizerId: string): Promise<void>;
  updateMatch(input: UpdateMatchInput, organizerId: string): Promise<void>;
  updateIndividualPairing(
    input: UpdateIndividualPairingInput,
    organizerId: string,
  ): Promise<void>;
  submitScore(input: SubmitScoreInput, userId: string): Promise<void>;
  reviewSubmission(input: ReviewSubmissionInput, organizerId: string): Promise<void>;
  generateKnockout(tournamentId: string, organizerId: string): Promise<void>;
  configureIndividualKnockout(
    input: ConfigureIndividualKnockoutInput,
    organizerId: string,
  ): Promise<void>;
}
