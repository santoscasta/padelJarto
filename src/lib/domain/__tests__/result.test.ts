import { describe, expect, it } from 'vitest';
import { validateSets, winnerOfSets } from '../result';
import { isOk, isFail } from '../action-result';

describe('validateSets', () => {
  it('accepts 6-4 6-3 (two straight sets)', () => {
    const r = validateSets([{ a: 6, b: 4 }, { a: 6, b: 3 }]);
    expect(isOk(r)).toBe(true);
  });
  it('accepts 6-4 3-6 7-5 (three sets)', () => {
    const r = validateSets([{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 7, b: 5 }]);
    expect(isOk(r)).toBe(true);
  });
  it('accepts 7-6 tiebreak', () => {
    const r = validateSets([{ a: 7, b: 6 }, { a: 7, b: 6 }]);
    expect(isOk(r)).toBe(true);
  });
  it('rejects 5-3 (not enough games to win set)', () => {
    const r = validateSets([{ a: 5, b: 3 }, { a: 6, b: 2 }]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects 6-5 (would require 7 to close)', () => {
    const r = validateSets([{ a: 6, b: 5 }, { a: 6, b: 2 }]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects single-set match', () => {
    const r = validateSets([{ a: 6, b: 4 }]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects four sets', () => {
    const r = validateSets([
      { a: 6, b: 4 }, { a: 3, b: 6 }, { a: 7, b: 5 }, { a: 6, b: 0 },
    ]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects when no player reaches 2 sets', () => {
    const r = validateSets([{ a: 6, b: 4 }, { a: 3, b: 6 }]);
    expect(isFail(r)).toBe(true);
  });
});

describe('winnerOfSets', () => {
  it('returns "a" when a wins more sets', () => {
    expect(winnerOfSets([{ a: 6, b: 4 }, { a: 6, b: 3 }])).toBe('a');
  });
  it('returns "b" when b wins more sets', () => {
    expect(winnerOfSets([{ a: 4, b: 6 }, { a: 3, b: 6 }])).toBe('b');
  });
});
