import { describe, expect, it } from "vitest";
import {
  assignPairsBalancedShuffle,
  assignPairsAutoRotation,
  assignVariablePairs,
} from "@/lib/domain/pairing";

const players = ["p1", "p2", "p3", "p4", "p5", "p6"];

describe("assignPairsBalancedShuffle", () => {
  it("pairs all players into groups of 2", () => {
    const pairs = assignPairsBalancedShuffle(players);
    expect(pairs).toHaveLength(3);
    const allPlayerIds = pairs.flatMap((p) => p.playerIds);
    expect(new Set(allPlayerIds).size).toBe(6);
  });

  it("handles odd number of players by leaving one out", () => {
    const pairs = assignPairsBalancedShuffle(["p1", "p2", "p3"]);
    expect(pairs).toHaveLength(1);
  });
});

describe("assignPairsAutoRotation", () => {
  it("minimizes repeating the same partner from previous round", () => {
    const previousPairs = [
      { playerIds: ["p1", "p2"] as [string, string] },
      { playerIds: ["p3", "p4"] as [string, string] },
      { playerIds: ["p5", "p6"] as [string, string] },
    ];

    const newPairs = assignPairsAutoRotation(players, previousPairs);
    expect(newPairs).toHaveLength(3);

    // Count how many pairs repeated from the previous round
    let repeats = 0;
    for (const newPair of newPairs) {
      const wasPartner = previousPairs.some(
        (prev) =>
          (prev.playerIds[0] === newPair.playerIds[0] &&
            prev.playerIds[1] === newPair.playerIds[1]) ||
          (prev.playerIds[0] === newPair.playerIds[1] &&
            prev.playerIds[1] === newPair.playerIds[0]),
      );
      if (wasPartner) repeats++;
    }
    // The algorithm should avoid most repeats; at most 1 may repeat as a fallback
    expect(repeats).toBeLessThanOrEqual(1);
  });

  it("handles no previous pairs", () => {
    const pairs = assignPairsAutoRotation(players, []);
    expect(pairs).toHaveLength(3);
  });
});

describe("assignVariablePairs", () => {
  it("uses manual strategy with provided pairs", () => {
    const manualPairs = [
      { playerIds: ["p1", "p6"] as [string, string] },
      { playerIds: ["p2", "p5"] as [string, string] },
      { playerIds: ["p3", "p4"] as [string, string] },
    ];
    const result = assignVariablePairs(players, "manual", [], manualPairs);
    expect(result).toEqual(manualPairs);
  });

  it("throws for manual strategy without pairs", () => {
    expect(() => assignVariablePairs(players, "manual")).toThrow();
  });

  it("uses balanced_shuffle strategy", () => {
    const result = assignVariablePairs(players, "balanced_shuffle");
    expect(result).toHaveLength(3);
  });

  it("uses auto_rotation strategy", () => {
    const previous = [{ playerIds: ["p1", "p2"] as [string, string] }];
    const result = assignVariablePairs(players, "auto_rotation", previous);
    expect(result).toHaveLength(3);
  });
});
