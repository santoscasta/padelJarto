import type { Match, Pair, Result } from './types';

export type StandingRow = Readonly<{
  pairId: string;
  played: number;
  wins: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
}>;

export function computeStandings(
  pairs: ReadonlyArray<Pair>,
  matches: ReadonlyArray<Match>,
  results: ReadonlyArray<Result>,
): ReadonlyArray<StandingRow> {
  const byMatch = new Map<string, Result>();
  for (const r of results) {
    if (r.status === 'validated') byMatch.set(r.matchId, r);
  }

  const rows = new Map<string, {
    played: number; wins: number;
    setsFor: number; setsAgainst: number;
    gamesFor: number; gamesAgainst: number;
    h2hWinsOver: Set<string>;
  }>();
  for (const p of pairs) {
    rows.set(p.id, {
      played: 0, wins: 0,
      setsFor: 0, setsAgainst: 0,
      gamesFor: 0, gamesAgainst: 0,
      h2hWinsOver: new Set(),
    });
  }

  for (const m of matches) {
    const res = byMatch.get(m.id);
    if (!res) continue;
    const a = rows.get(m.pairAId);
    const b = rows.get(m.pairBId);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    let aSets = 0;
    let bSets = 0;
    for (const s of res.sets) {
      a.gamesFor += s.a;
      a.gamesAgainst += s.b;
      b.gamesFor += s.b;
      b.gamesAgainst += s.a;
      if (s.a > s.b) aSets++;
      else bSets++;
    }
    a.setsFor += aSets;
    a.setsAgainst += bSets;
    b.setsFor += bSets;
    b.setsAgainst += aSets;
    if (res.winnerPairId === m.pairAId) {
      a.wins++;
      a.h2hWinsOver.add(m.pairBId);
    } else {
      b.wins++;
      b.h2hWinsOver.add(m.pairAId);
    }
  }

  const pairRating = new Map(pairs.map((p) => [p.id, p.rating] as const));

  const list = pairs.map((p) => {
    const r = rows.get(p.id)!;
    return { pairId: p.id, ...r };
  });

  list.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    const xSetDiff = x.setsFor - x.setsAgainst;
    const ySetDiff = y.setsFor - y.setsAgainst;
    if (ySetDiff !== xSetDiff) return ySetDiff - xSetDiff;
    const xGameDiff = x.gamesFor - x.gamesAgainst;
    const yGameDiff = y.gamesFor - y.gamesAgainst;
    if (yGameDiff !== xGameDiff) return yGameDiff - xGameDiff;
    // H2H: x beat y?
    if (x.h2hWinsOver.has(y.pairId) && !y.h2hWinsOver.has(x.pairId)) return -1;
    if (y.h2hWinsOver.has(x.pairId) && !x.h2hWinsOver.has(y.pairId)) return 1;
    // Stable fallback: pair rating desc, then id.
    const rDiff = (pairRating.get(y.pairId) ?? 0) - (pairRating.get(x.pairId) ?? 0);
    if (rDiff !== 0) return rDiff;
    return x.pairId.localeCompare(y.pairId);
  });

  return list.map(({ h2hWinsOver: _h2h, ...rest }) => rest);
}
