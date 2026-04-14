import type { SetScore } from './types';
import { ok, fail, type ActionResult } from './action-result';

function isValidSet(s: SetScore): boolean {
  if (!Number.isInteger(s.a) || !Number.isInteger(s.b) || s.a < 0 || s.b < 0) return false;
  const hi = Math.max(s.a, s.b);
  const lo = Math.min(s.a, s.b);
  if (hi === 6 && lo <= 4) return true;
  if (hi === 7 && (lo === 5 || lo === 6)) return true;
  return false;
}

export function winnerOfSets(sets: ReadonlyArray<SetScore>): 'a' | 'b' {
  let a = 0;
  let b = 0;
  for (const s of sets) (s.a > s.b ? a++ : b++);
  return a > b ? 'a' : 'b';
}

export function validateSets(sets: ReadonlyArray<SetScore>): ActionResult<ReadonlyArray<SetScore>> {
  if (sets.length < 2 || sets.length > 3) {
    return fail('VALIDATION_FAILED', 'El partido es al mejor de 3 sets');
  }
  for (const [i, s] of sets.entries()) {
    if (!isValidSet(s)) {
      return fail('VALIDATION_FAILED', `Set ${i + 1} inválido (${s.a}-${s.b})`);
    }
  }
  let aSets = 0;
  let bSets = 0;
  for (const s of sets) (s.a > s.b ? aSets++ : bSets++);
  if (aSets < 2 && bSets < 2) {
    return fail('VALIDATION_FAILED', 'Ningún jugador ha ganado dos sets');
  }
  return ok(sets);
}
