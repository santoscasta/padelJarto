export type AppRole = "organizer" | "player";
export type TournamentMode = "fixed_pairs" | "individual_ranking";
export type TournamentStatus = "draft" | "published" | "in_progress" | "completed" | "cancelled";
export type TournamentFormat = "league" | "playoff" | "league_playoff";
export type PairMode = "fixed" | "variable";
export type VariablePairStrategy = "manual" | "balanced_shuffle" | "auto_rotation";
export type StageType = "groups" | "knockout";
export type MatchStatus =
  | "draft"
  | "scheduled"
  | "pending"
  | "result_proposed"
  | "in_validation"
  | "in_dispute"
  | "pending_review"
  | "validated"
  | "closed";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired" | "rejected";
export type MembershipStatus = "invited" | "accepted";
export type RegistrationStatus = "pending" | "confirmed" | "voluntary_withdrawal" | "expelled";
export type ScoreSubmissionStatus = "pending_review" | "validated" | "rejected";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "overridden";
export type ValidationDecision = "accept" | "reject";
export type StandingsEntityType = "team" | "player";
export type ValidationMode = "player" | "organizer";
export type RoundStatus = "pending" | "in_progress" | "completed";

export interface TournamentRules {
  id?: string;
  tournamentId?: string;
  bestOfSets: number;
  setsToWin: number;
  tiebreakAt: number;
  pointsWin?: number;
  pointsLoss?: number;
  pointsWalkover?: number;
  tieBreakRule?: string;
  validationMode?: 'rival' | 'organizer' | 'auto';
}

export interface TournamentRulesRow {
  id: string;
  tournamentId: string;
  pointsWin: number;
  pointsLoss: number;
  bestOfSets: number;
  tieBreakRule: string[];
  validationMode: ValidationMode;
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
  username?: string | null;
  city?: string | null;
  level?: string | null;
  dominantHand?: "right" | "left" | "ambidextrous" | null;
  avatarUrl?: string | null;
  avatarPath?: string;
  club?: string;
  bio?: string;
  createdAt?: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoPath?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  status: TournamentStatus;
  visibility: "private" | "public";
  mode: TournamentMode;
  format: TournamentFormat;
  pairMode: PairMode;
  organizerId: string;
  clubId?: string | null;
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

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  userId: string;
  status: RegistrationStatus;
  registeredAt: string;
  confirmedAt?: string | null;
}

export interface Invitation {
  id: string;
  tournamentId: string;
  token: string;
  invitedEmail?: string | null;
  status: InvitationStatus;
  createdBy: string;
  createdAt: string;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  message?: string;
  // Joined data
  tournament?: { name: string; format: string; status: TournamentStatus };
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

export interface Round {
  id: string;
  tournamentId: string;
  stageId: string;
  roundNumber: number;
  name?: string | null;
  status: RoundStatus;
  scheduledDate?: string | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  stageId: string;
  groupId?: string | null;
  roundId?: string | null;
  roundLabel?: string | null;
  bracketRound?: number | null;
  bracketPosition?: number | null;
  status: MatchStatus;
  scheduledAt?: string | null;
  court?: string | null;
  courtName?: string | null;
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

export interface MatchResultProposal {
  id: string;
  matchId: string;
  proposedBy: string;
  scoreJson: ScoreSet[];
  winnerSide?: "home" | "away" | null;
  notes?: string | null;
  status: ProposalStatus;
  createdAt: string;
}

export interface MatchResultValidation {
  id: string;
  proposalId: string;
  validatorId: string;
  decision: ValidationDecision;
  reason?: string | null;
  createdAt: string;
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

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MatchWithContext extends Match {
  sides: [MatchSide, MatchSide];
  latestSubmission?: ScoreSubmission | null;
  validatedSubmission?: ScoreSubmission | null;
  proposals?: MatchResultProposal[];
  validations?: MatchResultValidation[];
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
  rounds: Round[];
  rules?: TournamentRulesRow | null;
  registrations: TournamentRegistration[];
}

export interface DashboardTournamentSummary {
  tournament: Tournament;
  membership: TournamentMembership;
  pendingPlayerMatches: number;
  pendingReviewCount: number;
  pendingValidations: number;
}

export interface DashboardSnapshot {
  currentUser: Profile;
  tournaments: DashboardTournamentSummary[];
  invitations: Invitation[];
  notifications: Notification[];
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
  rounds: Round[];
  rules?: TournamentRulesRow | null;
  registrations: TournamentRegistration[];
  proposals: MatchResultProposal[];
  proposalValidations: MatchResultValidation[];
}

export interface CreateTournamentInput {
  name: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  mode: TournamentMode;
  format: TournamentFormat;
  pairMode: PairMode;
  groupCount: number;
  qualifiersPerGroup: number;
  knockoutSize: number;
  clubId?: string;
}

export interface CreateInvitationInput {
  tournamentId: string;
  invitedEmail?: string;
  expiresAt?: string;
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

export interface ProposeResultInput {
  tournamentId: string;
  matchId: string;
  sets: ScoreSet[];
  winnerSide: "home" | "away";
  notes?: string;
}

export interface ValidateResultInput {
  tournamentId: string;
  proposalId: string;
  decision: ValidationDecision;
  reason?: string;
}

export interface ResolveDisputeInput {
  tournamentId: string;
  matchId: string;
  sets: ScoreSet[];
  winnerSide: "home" | "away";
  reason: string;
}

export interface UpdateProfileInput {
  username?: string;
  fullName?: string;
  city?: string;
  level?: string;
  dominantHand?: "right" | "left" | "ambidextrous";
}

export interface CreateClubInput {
  name: string;
  description?: string;
}

export interface IndividualKnockoutPair {
  label: string;
  playerIds: [string, string];
}

export interface ConfigureIndividualKnockoutInput {
  tournamentId: string;
  pairs: IndividualKnockoutPair[];
}

export interface AssignVariablePairsInput {
  tournamentId: string;
  roundId: string;
  strategy: VariablePairStrategy;
  manualPairs?: Array<{ playerIds: [string, string] }>;
}

export interface TournamentRepository {
  ensureProfile(profile: Profile): Promise<void>;
  getDashboard(userId: string): Promise<DashboardSnapshot>;
  getInvitationByToken(token: string): Promise<Invitation | null>;
  acceptInvitation(token: string, profile: Profile): Promise<string>;
  rejectInvitation(invitationId: string, userId: string): Promise<void>;
  createTournament(input: CreateTournamentInput, organizer: Profile): Promise<Tournament>;
  publishTournament(tournamentId: string, organizerId: string): Promise<void>;
  cancelTournament(tournamentId: string, organizerId: string): Promise<void>;
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
  proposeResult(input: ProposeResultInput, userId: string): Promise<void>;
  validateResult(input: ValidateResultInput, userId: string): Promise<void>;
  resolveDispute(input: ResolveDisputeInput, organizerId: string): Promise<void>;
  closeMatch(matchId: string, organizerId: string): Promise<void>;
  updateProfile(input: UpdateProfileInput, userId: string): Promise<void>;
  createClub(input: CreateClubInput, userId: string): Promise<Club>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  expireInvitations(): Promise<number>;
  assignVariablePairs(input: AssignVariablePairsInput, organizerId: string): Promise<void>;
}
