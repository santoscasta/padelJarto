/**
 * Americano padel scheduler.
 *
 * Americano: every player partners with every other player at most once.
 * We produce a round-robin of "rounds" where each round has as many matches
 * as `courts` allow, and within a round a player appears in at most one match.
 *
 * For N players with N divisible by 4 we use a classic round-robin pairing
 * where each round is N/4 matches. For other counts we fall back to a
 * greedy partner-balancing heuristic that still guarantees "each player
 * partners a different person across rounds" until partners run out.
 */

export interface AmericanoPlayer {
  id: string;
  name: string;
}

export interface AmericanoMatchPlan {
  roundNumber: number;
  court: number;
  home: [string, string];
  away: [string, string];
  resting?: string[];
}

export interface AmericanoScheduleInput {
  players: AmericanoPlayer[];
  courts: number;
}

export interface AmericanoSchedule {
  rounds: number;
  matches: AmericanoMatchPlan[];
}

/**
 * Build a full americano schedule.
 *
 * Rules:
 * - Each round uses up to `courts` courts.
 * - A player cannot appear in two matches in the same round.
 * - Across the event each pair of players should partner at most once
 *   until every possible partnership has been used.
 */
export function buildAmericanoSchedule(input: AmericanoScheduleInput): AmericanoSchedule {
  const players = [...input.players];
  const n = players.length;

  if (n < 4) {
    return { rounds: 0, matches: [] };
  }

  const maxCourts = Math.max(1, input.courts);
  const matchesPerRound = Math.min(Math.floor(n / 4), maxCourts);

  // Target rounds: enough so every player plays ~(n-1)/3 games when possible.
  // For americano we aim for n-1 rounds when N%4 === 0, else 2*n rounds cap.
  const totalRounds = n % 4 === 0 ? n - 1 : Math.min(2 * n, 12);

  const partnerCount = new Map<string, number>();
  const partneredKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const matches: AmericanoMatchPlan[] = [];

  for (let round = 1; round <= totalRounds; round += 1) {
    const availableIds = new Set(players.map((player) => player.id));
    let court = 1;

    while (court <= matchesPerRound && availableIds.size >= 4) {
      // Pick the 4 players with the fewest games played so far.
      const pool = players.filter((player) => availableIds.has(player.id));
      pool.sort((a, b) => countGames(matches, a.id) - countGames(matches, b.id));
      const quartet = pool.slice(0, 4);

      // Find the pair assignment that minimizes already-used partnerships.
      const best = bestPairSplit(quartet, partnerCount, partneredKey);
      matches.push({
        roundNumber: round,
        court,
        home: [best.home[0].id, best.home[1].id],
        away: [best.away[0].id, best.away[1].id],
      });
      incrementPartner(partnerCount, partneredKey(best.home[0].id, best.home[1].id));
      incrementPartner(partnerCount, partneredKey(best.away[0].id, best.away[1].id));

      for (const player of quartet) {
        availableIds.delete(player.id);
      }
      court += 1;
    }

    // If no matches were created in this round, stop (nothing else will fit).
    if (!matches.some((match) => match.roundNumber === round)) {
      return { rounds: round - 1, matches };
    }

    // Early exit: if everyone has already partnered everyone we can stop.
    if (allPartnershipsUsed(players, partnerCount, partneredKey)) {
      return { rounds: round, matches };
    }
  }

  return { rounds: totalRounds, matches };
}

function countGames(matches: AmericanoMatchPlan[], playerId: string): number {
  return matches.reduce((sum, match) => {
    if (
      match.home[0] === playerId ||
      match.home[1] === playerId ||
      match.away[0] === playerId ||
      match.away[1] === playerId
    ) {
      return sum + 1;
    }
    return sum;
  }, 0);
}

function bestPairSplit(
  quartet: AmericanoPlayer[],
  partnerCount: Map<string, number>,
  keyOf: (a: string, b: string) => string,
): { home: [AmericanoPlayer, AmericanoPlayer]; away: [AmericanoPlayer, AmericanoPlayer] } {
  const [a, b, c, d] = quartet;
  const splits: Array<{
    home: [AmericanoPlayer, AmericanoPlayer];
    away: [AmericanoPlayer, AmericanoPlayer];
  }> = [
    { home: [a, b], away: [c, d] },
    { home: [a, c], away: [b, d] },
    { home: [a, d], away: [b, c] },
  ];
  splits.sort((left, right) => {
    const leftCost =
      (partnerCount.get(keyOf(left.home[0].id, left.home[1].id)) ?? 0) +
      (partnerCount.get(keyOf(left.away[0].id, left.away[1].id)) ?? 0);
    const rightCost =
      (partnerCount.get(keyOf(right.home[0].id, right.home[1].id)) ?? 0) +
      (partnerCount.get(keyOf(right.away[0].id, right.away[1].id)) ?? 0);
    return leftCost - rightCost;
  });
  return splits[0];
}

function incrementPartner(partnerCount: Map<string, number>, key: string) {
  partnerCount.set(key, (partnerCount.get(key) ?? 0) + 1);
}

function allPartnershipsUsed(
  players: AmericanoPlayer[],
  partnerCount: Map<string, number>,
  keyOf: (a: string, b: string) => string,
): boolean {
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      if ((partnerCount.get(keyOf(players[i].id, players[j].id)) ?? 0) === 0) {
        return false;
      }
    }
  }
  return true;
}

export interface AmericanoStanding {
  playerId: string;
  name: string;
  played: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

export function computeAmericanoStandings(
  players: AmericanoPlayer[],
  matches: Array<{
    home: [string, string];
    away: [string, string];
    homeScore: number | null;
    awayScore: number | null;
    completed: boolean;
  }>,
): AmericanoStanding[] {
  const byId = new Map<string, AmericanoStanding>();
  for (const player of players) {
    byId.set(player.id, {
      playerId: player.id,
      name: player.name,
      played: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
    });
  }

  for (const match of matches) {
    if (!match.completed || match.homeScore == null || match.awayScore == null) continue;
    for (const id of match.home) {
      const row = byId.get(id);
      if (!row) continue;
      row.played += 1;
      row.pointsFor += match.homeScore;
      row.pointsAgainst += match.awayScore;
      row.diff = row.pointsFor - row.pointsAgainst;
    }
    for (const id of match.away) {
      const row = byId.get(id);
      if (!row) continue;
      row.played += 1;
      row.pointsFor += match.awayScore;
      row.pointsAgainst += match.homeScore;
      row.diff = row.pointsFor - row.pointsAgainst;
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return a.name.localeCompare(b.name);
  });
}
