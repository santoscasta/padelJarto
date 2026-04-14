import { describe, expect, it } from 'vitest';
import { mulberry32, seededShuffle } from '../rng';

describe('rng', () => {
  it('mulberry32 produces identical streams for identical seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 8; i++) expect(a()).toBeCloseTo(b());
  });
  it('mulberry32 produces different streams for different seeds', () => {
    const a = mulberry32(42)();
    const b = mulberry32(43)();
    expect(a).not.toBeCloseTo(b);
  });
  it('seededShuffle is deterministic and preserves elements', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const a = seededShuffle(input, 7);
    const b = seededShuffle(input, 7);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([...input].sort());
  });
  it('seededShuffle does not mutate input', () => {
    const input = [1, 2, 3];
    seededShuffle(input, 1);
    expect(input).toEqual([1, 2, 3]);
  });
});
