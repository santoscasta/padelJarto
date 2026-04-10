import { createDemoSeed } from "@/lib/domain/mock-data";
import {
  type Group,
  type Invitation,
  type Match,
  type MatchResultProposal,
  type MatchResultValidation,
  type MatchSide,
  type Notification,
  type Profile,
  type Round,
  type ScoreSubmission,
  type Stage,
  type StandingRow,
  type Team,
  type TeamMember,
  type Tournament,
  type TournamentMembership,
  type TournamentRegistration,
} from "@/lib/domain/types";

export interface DemoStore {
  groups: Group[];
  invitations: Invitation[];
  matches: Match[];
  memberships: TournamentMembership[];
  matchSides: MatchSide[];
  notifications: Notification[];
  profiles: Profile[];
  proposals: MatchResultProposal[];
  proposalValidations: MatchResultValidation[];
  registrations: TournamentRegistration[];
  rounds: Round[];
  scoreSubmissions: ScoreSubmission[];
  stages: Stage[];
  standings: StandingRow[];
  teamMembers: TeamMember[];
  teams: Team[];
  tournaments: Tournament[];
}

let store: DemoStore = { ...createDemoSeed(), notifications: [] };

export function getDemoStore() {
  return structuredClone(store) as DemoStore;
}

export function replaceDemoStore(nextStore: DemoStore) {
  store = structuredClone(nextStore);
}

export function mutateDemoStore(mutator: (draft: DemoStore) => void) {
  const draft = getDemoStore();
  mutator(draft);
  replaceDemoStore(draft);
  return draft;
}

export function resetDemoStore() {
  replaceDemoStore({ ...createDemoSeed(), notifications: [] });
}
