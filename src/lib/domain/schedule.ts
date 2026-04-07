import {
  type Match,
  type MatchSide,
  type Profile,
  type Stage,
  type Team,
  type Tournament,
} from "@/lib/domain/types";

function rotateArray<T>(values: T[]) {
  if (values.length <= 2) {
    return values;
  }

  const fixed = values[0];
  const rotating = values.slice(1);
  const moved = rotating.pop();

  if (!moved) {
    return values;
  }

  return [fixed, moved, ...rotating];
}

export function createRoundRobinPairs(participantIds: string[]) {
  const ids = [...participantIds];
  const isOdd = ids.length % 2 === 1;

  if (isOdd) {
    ids.push("BYE");
  }

  const rounds: Array<Array<[string, string]>> = [];
  let working = [...ids];

  for (let round = 0; round < working.length - 1; round += 1) {
    const pairs: Array<[string, string]> = [];

    for (let index = 0; index < working.length / 2; index += 1) {
      const home = working[index];
      const away = working[working.length - 1 - index];

      if (home !== "BYE" && away !== "BYE") {
        pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }

    rounds.push(pairs);
    working = rotateArray(working);
  }

  return rounds;
}

export function snakeSeedIntoGroups(participantIds: string[], groupCount: number) {
  const groups = Array.from({ length: groupCount }, () => [] as string[]);
  let pointer = 0;
  let direction = 1;

  for (const participantId of participantIds) {
    groups[pointer].push(participantId);

    if (pointer === groupCount - 1) {
      direction = -1;
    } else if (pointer === 0) {
      direction = 1;
    }

    pointer += direction;
  }

  return groups;
}

function combinationsOfFour(values: string[]) {
  const result: string[][] = [];

  for (let a = 0; a < values.length - 3; a += 1) {
    for (let b = a + 1; b < values.length - 2; b += 1) {
      for (let c = b + 1; c < values.length - 1; c += 1) {
        for (let d = c + 1; d < values.length; d += 1) {
          result.push([values[a], values[b], values[c], values[d]]);
        }
      }
    }
  }

  return result;
}

function keyForPair(first: string, second: string) {
  return [first, second].sort().join(":");
}

function getPairingOptions([a, b, c, d]: string[]) {
  return [
    [
      [a, b],
      [c, d],
    ],
    [
      [a, c],
      [b, d],
    ],
    [
      [a, d],
      [b, c],
    ],
  ] as Array<[[string, string], [string, string]]>;
}

export interface IndividualProposal {
  homePlayerIds: [string, string];
  awayPlayerIds: [string, string];
}

export function createIndividualRoundProposals(playerIds: string[], targetMatchCount: number) {
  const appearances = new Map(playerIds.map((playerId) => [playerId, 0]));
  const teammateCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const proposals: IndividualProposal[] = [];

  for (let matchIndex = 0; matchIndex < targetMatchCount; matchIndex += 1) {
    const combo = combinationsOfFour(playerIds).sort((left, right) => {
      const leftScore = left.reduce((sum, playerId) => sum + (appearances.get(playerId) ?? 0), 0);
      const rightScore = right.reduce((sum, playerId) => sum + (appearances.get(playerId) ?? 0), 0);
      return leftScore - rightScore;
    })[0];

    if (!combo) {
      break;
    }

    let bestPairing: [[string, string], [string, string]] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const option of getPairingOptions(combo)) {
      const [[homeA, homeB], [awayA, awayB]] = option;
      const teammatePenalty =
        (teammateCounts.get(keyForPair(homeA, homeB)) ?? 0) * 20 +
        (teammateCounts.get(keyForPair(awayA, awayB)) ?? 0) * 20;
      const opponentPenalty =
        (opponentCounts.get(keyForPair(homeA, awayA)) ?? 0) * 5 +
        (opponentCounts.get(keyForPair(homeA, awayB)) ?? 0) * 5 +
        (opponentCounts.get(keyForPair(homeB, awayA)) ?? 0) * 5 +
        (opponentCounts.get(keyForPair(homeB, awayB)) ?? 0) * 5;
      const appearancePenalty =
        (appearances.get(homeA) ?? 0) +
        (appearances.get(homeB) ?? 0) +
        (appearances.get(awayA) ?? 0) +
        (appearances.get(awayB) ?? 0);
      const totalScore = teammatePenalty + opponentPenalty + appearancePenalty;

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestPairing = option;
      }
    }

    if (!bestPairing) {
      break;
    }

    const [[homeA, homeB], [awayA, awayB]] = bestPairing;
    proposals.push({
      awayPlayerIds: [awayA, awayB],
      homePlayerIds: [homeA, homeB],
    });

    for (const playerId of [homeA, homeB, awayA, awayB]) {
      appearances.set(playerId, (appearances.get(playerId) ?? 0) + 1);
    }

    const teammatePairs = [keyForPair(homeA, homeB), keyForPair(awayA, awayB)];
    const opponentPairs = [
      keyForPair(homeA, awayA),
      keyForPair(homeA, awayB),
      keyForPair(homeB, awayA),
      keyForPair(homeB, awayB),
    ];

    for (const pairKey of teammatePairs) {
      teammateCounts.set(pairKey, (teammateCounts.get(pairKey) ?? 0) + 1);
    }

    for (const pairKey of opponentPairs) {
      opponentCounts.set(pairKey, (opponentCounts.get(pairKey) ?? 0) + 1);
    }
  }

  return proposals;
}

export interface SeededEntry {
  label: string;
  teamId?: string | null;
  playerIds?: [string, string];
}

function createBracketSeeds(size: number): number[] {
  let bracket = [1, 2];

  while (bracket.length < size) {
    const nextSize = bracket.length * 2;
    const nextRound: number[] = [];

    for (const seed of bracket) {
      nextRound.push(seed, nextSize + 1 - seed);
    }

    bracket = nextRound;
  }

  return bracket;
}

export function buildKnockoutMatches(
  tournament: Tournament,
  stage: Stage,
  entries: SeededEntry[],
): { matches: Match[]; matchSides: MatchSide[] } {
  const size = tournament.config.knockoutSize;
  const seedMap = new Map(entries.map((entry, index) => [index + 1, entry]));
  const seedPositions = createBracketSeeds(size);
  const matches: Match[] = [];
  const matchSides: MatchSide[] = [];
  const totalRounds = Math.log2(size);
  const now = new Date().toISOString();

  for (let round = 1; round <= totalRounds; round += 1) {
    const matchesInRound = size / 2 ** round;

    for (let position = 1; position <= matchesInRound; position += 1) {
      const matchId = crypto.randomUUID();
      matches.push({
        bracketPosition: position,
        bracketRound: round,
        court: null,
        createdAt: now,
        groupId: null,
        id: matchId,
        roundLabel:
          round === totalRounds
            ? "Final"
            : round === totalRounds - 1
              ? `Semifinal ${position}`
              : `Ronda ${round} · Partido ${position}`,
        scheduledAt: null,
        stageId: stage.id,
        status: "draft",
        tournamentId: tournament.id,
        updatedAt: now,
        validatedSubmissionId: null,
      });

      if (round === 1) {
        const leftSeed = seedPositions[(position - 1) * 2];
        const rightSeed = seedPositions[(position - 1) * 2 + 1];
        const leftEntry = seedMap.get(leftSeed);
        const rightEntry = seedMap.get(rightSeed);

        matchSides.push({
          id: crypto.randomUUID(),
          matchId,
          playerIds: leftEntry?.playerIds ?? [],
          side: "home",
          teamId: leftEntry?.teamId ?? null,
        });
        matchSides.push({
          id: crypto.randomUUID(),
          matchId,
          playerIds: rightEntry?.playerIds ?? [],
          side: "away",
          teamId: rightEntry?.teamId ?? null,
        });
      } else {
        matchSides.push({
          id: crypto.randomUUID(),
          matchId,
          playerIds: [],
          side: "home",
          teamId: null,
        });
        matchSides.push({
          id: crypto.randomUUID(),
          matchId,
          playerIds: [],
          side: "away",
          teamId: null,
        });
      }
    }
  }

  return { matches, matchSides };
}

export function findNextKnockoutSlot(match: Match) {
  if (!match.bracketRound || !match.bracketPosition) {
    return null;
  }

  return {
    nextPosition: Math.ceil(match.bracketPosition / 2),
    nextRound: match.bracketRound + 1,
    side: match.bracketPosition % 2 === 1 ? "home" : "away",
  } as const;
}

export function describeTeam(team: Team, players: Profile[]) {
  return `${team.name} · ${players.map((player) => player.fullName).join(" / ")}`;
}
