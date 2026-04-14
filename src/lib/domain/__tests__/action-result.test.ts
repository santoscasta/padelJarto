import { describe, expect, it } from 'vitest';
import { ok, fail, isOk, isFail, type ActionResult } from '../action-result';

describe('ActionResult', () => {
  it('ok() wraps data', () => {
    const r: ActionResult<number> = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });
  it('fail() wraps an error code + message', () => {
    const r = fail('NOT_FOUND', 'player not found');
    expect(r).toEqual({ ok: false, code: 'NOT_FOUND', message: 'player not found' });
  });
  it('fail() accepts fields map', () => {
    const r = fail('VALIDATION_FAILED', 'bad input', { name: 'required' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields).toEqual({ name: 'required' });
  });
  it('isOk / isFail narrow correctly', () => {
    const r: ActionResult<string> = ok('x');
    expect(isOk(r)).toBe(true);
    expect(isFail(r)).toBe(false);
  });
});
