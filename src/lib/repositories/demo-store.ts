import { createDemoSeed } from "@/lib/domain/mock-data";
import {
  type Group,
  type Invitation,
  type Match,
  type MatchSide,
  type Profile,
  type ScoreSubmission,
  type Stage,
  type StandingRow,
  type Team,
  type TeamMember,
  type Tournament,
  type TournamentMembership,
} from "@/lib/domain/types";

export interface DemoStore {
  groups: Group[];
  invitations: Invitation[];
  matches: Match[];
  memberships: TournamentMembership[];
  matchSides: MatchSide[];
  profiles: Profile[];
  scoreSubmissions: ScoreSubmission[];
  stages: Stage[];
  standings: StandingRow[];
  teamMembers: TeamMember[];
  teams: Team[];
  tournaments: Tournament[];
}

let store = createDemoSeed();

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
  replaceDemoStore(createDemoSeed());
}
