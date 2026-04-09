import { describe, expect, it } from "vitest";
import {
  buildAmericanoSchedule,
  computeAmericanoStandings,
  type AmericanoPlayer,
} from "../americano";

function makePlayers(n: number): AmericanoPlayer[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Jugador ${index + 1}`,
  }));
}

describe("buildAmericanoSchedule", () => {
  it("returns nothing when fewer than 4 players", () => {
    const schedule = buildAmericanoSchedule({ players: makePlayers(3), courts: 1 });
    expect(schedule.matches).toHaveLength(0);
    expect(schedule.rounds).toBe(0);
  });

  it("produces a 4-player americano of 3 rounds", () => {
    const schedule = buildAmericanoSchedule({ players: makePlayers(4), courts: 1 });
    expect(schedule.rounds).toBeGreaterThanOrEqual(3);
    // 4 players can partner in 3 distinct rounds; first 3 rounds should cover
    // all 3 partnerships.
    const firstThree = schedule.matches.slice(0, 3);
    const partnerKeys = new Set<string>();
    for (const match of firstThree) {
      const a = [...match.home].sort().join("-");
      const b = [...match.away].sort().join("-");
      partnerKeys.add(a);
      partnerKeys.add(b);
    }
    expect(partnerKeys.size).toBe(6);
  });

  it("never places a player in two matches of the same round", () => {
    const schedule = buildAmericanoSchedule({ players: makePlayers(8), courts: 2 });
    const roundGroups = new Map<number, Set<string>>();
    for (const match of schedule.matches) {
      const set = roundGroups.get(match.roundNumber) ?? new Set<string>();
      const ids = [...match.home, ...match.away];
      for (const id of ids) {
        expect(set.has(id)).toBe(false);
        set.add(id);
      }
      roundGroups.set(match.roundNumber, set);
    }
  });

  it("respects court limit per round", () => {
    const schedule = buildAmericanoSchedule({ players: makePlayers(12), courts: 2 });
    const perRound = new Map<number, number>();
    for (const match of schedule.matches) {
      perRound.set(match.roundNumber, (perRound.get(match.roundNumber) ?? 0) + 1);
    }
    for (const count of perRound.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });
});

describe("computeAmericanoStandings", () => {
  it("sorts by points, then diff, then name", () => {
    const players = makePlayers(4);
    const standings = computeAmericanoStandings(players, [
      {
        home: ["p1", "p2"],
        away: ["p3", "p4"],
        homeScore: 21,
        awayScore: 15,
        completed: true,
      },
      {
        home: ["p1", "p3"],
        away: ["p2", "p4"],
        homeScore: 18,
        awayScore: 21,
        completed: true,
      },
    ]);
    expect(standings[0].playerId).toBe("p2");
    expect(standings.every((row) => row.played === 2)).toBe(true);
  });

  it("ignores incomplete matches", () => {
    const players = makePlayers(4);
    const standings = computeAmericanoStandings(players, [
      { home: ["p1", "p2"], away: ["p3", "p4"], homeScore: null, awayScore: null, completed: false },
    ]);
    expect(standings.every((row) => row.played === 0)).toBe(true);
  });
});
