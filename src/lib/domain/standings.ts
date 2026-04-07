import {
  type MatchSide,
  type MatchWithContext,
  type ScoreSet,
  type ScoreSubmission,
  type StandingRow,
  type StandingsEntityType,
  type Tournament,
} from "@/lib/domain/types";

interface BaseStatLine {
  entityId: string;
  gamesAgainst: number;
  gamesFor: number;
  losses: number;
  played: number;
  setsAgainst: number;
  setsFor: number;
  wins: number;
}

function sumGames(sets: ScoreSet[], side: "home" | "away") {
  return sets.reduce((sum, set) => sum + (side === "home" ? set.home : set.away), 0);
}

function countSets(sets: ScoreSet[], side: "home" | "away") {
  return sets.reduce((sum, set) => {
    const homeWon = set.home > set.away;
    if ((side === "home" && homeWon) || (side === "away" && !homeWon)) {
      return sum + 1;
    }

    return sum;
  }, 0);
}

export function getValidatedSubmission(match: MatchWithContext) {
  return match.validatedSubmission ?? null;
}

export function resolveMatchWinner(
  sets: ScoreSet[],
  homeSide: MatchSide,
  awaySide: MatchSide,
) {
  const homeSets = countSets(sets, "home");
  const awaySets = countSets(sets, "away");

  if (homeSets === awaySets) {
    return null;
  }

  return homeSets > awaySets ? homeSide : awaySide;
}

function entityIdsFromSide(
  side: MatchSide,
  entityType: StandingsEntityType,
): string[] {
  if (entityType === "team") {
    return side.teamId ? [side.teamId] : [];
  }

  return side.playerIds;
}

function createBlankStatLine(entityId: string): BaseStatLine {
  return {
    entityId,
    gamesAgainst: 0,
    gamesFor: 0,
    losses: 0,
    played: 0,
    setsAgainst: 0,
    setsFor: 0,
    wins: 0,
  };
}

function updateStatLine(statLine: BaseStatLine, ownSets: number, opponentSets: number, ownGames: number, opponentGames: number) {
  statLine.played += 1;
  statLine.gamesFor += ownGames;
  statLine.gamesAgainst += opponentGames;
  statLine.setsFor += ownSets;
  statLine.setsAgainst += opponentSets;

  if (ownSets > opponentSets) {
    statLine.wins += 1;
  } else {
    statLine.losses += 1;
  }
}

function compareStatLines(left: BaseStatLine, right: BaseStatLine) {
  if (left.wins !== right.wins) {
    return right.wins - left.wins;
  }

  const leftSetDiff = left.setsFor - left.setsAgainst;
  const rightSetDiff = right.setsFor - right.setsAgainst;
  if (leftSetDiff !== rightSetDiff) {
    return rightSetDiff - leftSetDiff;
  }

  const leftGameDiff = left.gamesFor - left.gamesAgainst;
  const rightGameDiff = right.gamesFor - right.gamesAgainst;
  if (leftGameDiff !== rightGameDiff) {
    return rightGameDiff - leftGameDiff;
  }

  return left.entityId.localeCompare(right.entityId);
}

function buildMiniTable(
  entityIds: string[],
  matches: MatchWithContext[],
  entityType: StandingsEntityType,
) {
  const table = new Map(entityIds.map((entityId) => [entityId, createBlankStatLine(entityId)]));

  for (const match of matches) {
    const validated = getValidatedSubmission(match);
    if (!validated) {
      continue;
    }

    const [home, away] = match.sides;
    const homeEntities = entityIdsFromSide(home, entityType).filter((entityId) =>
      table.has(entityId),
    );
    const awayEntities = entityIdsFromSide(away, entityType).filter((entityId) =>
      table.has(entityId),
    );

    if (!homeEntities.length || !awayEntities.length) {
      continue;
    }

    const homeSets = countSets(validated.sets, "home");
    const awaySets = countSets(validated.sets, "away");
    const homeGames = sumGames(validated.sets, "home");
    const awayGames = sumGames(validated.sets, "away");

    for (const entityId of homeEntities) {
      updateStatLine(table.get(entityId)!, homeSets, awaySets, homeGames, awayGames);
    }

    for (const entityId of awayEntities) {
      updateStatLine(table.get(entityId)!, awaySets, homeSets, awayGames, homeGames);
    }
  }

  return table;
}

export function calculateStandings(
  tournament: Tournament,
  stageId: string,
  groupId: string,
  entityIds: string[],
  matches: MatchWithContext[],
): StandingRow[] {
  const entityType: StandingsEntityType =
    tournament.mode === "fixed_pairs" ? "team" : "player";
  const stats = new Map(entityIds.map((entityId) => [entityId, createBlankStatLine(entityId)]));

  for (const match of matches) {
    const validated = getValidatedSubmission(match);
    if (!validated) {
      continue;
    }

    const [homeSide, awaySide] = match.sides;
    const homeEntityIds = entityIdsFromSide(homeSide, entityType);
    const awayEntityIds = entityIdsFromSide(awaySide, entityType);
    const homeSets = countSets(validated.sets, "home");
    const awaySets = countSets(validated.sets, "away");
    const homeGames = sumGames(validated.sets, "home");
    const awayGames = sumGames(validated.sets, "away");

    for (const entityId of homeEntityIds) {
      const statLine = stats.get(entityId);
      if (!statLine) {
        continue;
      }

      updateStatLine(statLine, homeSets, awaySets, homeGames, awayGames);
    }

    for (const entityId of awayEntityIds) {
      const statLine = stats.get(entityId);
      if (!statLine) {
        continue;
      }

      updateStatLine(statLine, awaySets, homeSets, awayGames, homeGames);
    }
  }

  const ordered = [...stats.values()].sort(compareStatLines);
  const winsBuckets = new Map<number, BaseStatLine[]>();

  for (const statLine of ordered) {
    const bucket = winsBuckets.get(statLine.wins) ?? [];
    bucket.push(statLine);
    winsBuckets.set(statLine.wins, bucket);
  }

  const finalOrder: BaseStatLine[] = [];

  for (const wins of [...winsBuckets.keys()].sort((left, right) => right - left)) {
    const bucket = winsBuckets.get(wins) ?? [];

    if (bucket.length === 1) {
      finalOrder.push(bucket[0]);
      continue;
    }

    const miniTable = buildMiniTable(
      bucket.map((line) => line.entityId),
      matches,
      entityType,
    );

    finalOrder.push(
      ...bucket.sort((left, right) => {
        const miniLeft = miniTable.get(left.entityId);
        const miniRight = miniTable.get(right.entityId);

        if (miniLeft && miniRight && miniLeft.wins !== miniRight.wins) {
          return miniRight.wins - miniLeft.wins;
        }

        return compareStatLines(left, right);
      }),
    );
  }

  return finalOrder.map((line, index) => ({
    entityId: line.entityId,
    entityType,
    gamesAgainst: line.gamesAgainst,
    gamesFor: line.gamesFor,
    groupId,
    id: `${groupId}:${line.entityId}`,
    losses: line.losses,
    played: line.played,
    rank: index + 1,
    setsAgainst: line.setsAgainst,
    setsFor: line.setsFor,
    stageId,
    tournamentId: tournament.id,
    wins: line.wins,
  }));
}

export function extractScorableSubmissions(
  matches: MatchWithContext[],
  submissions: ScoreSubmission[],
) {
  const matchIds = new Set(matches.map((match) => match.id));
  return submissions.filter((submission) => matchIds.has(submission.matchId));
}
