import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInMemoryRateLimiter } from './rate-limit';

describe('createInMemoryRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());

  it('allows up to `max` requests per window and blocks the next one', async () => {
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 0));
    const rl = createInMemoryRateLimiter({ max: 3, windowMs: 60_000 });
    expect((await rl.check('k')).ok).toBe(true);
    expect((await rl.check('k')).ok).toBe(true);
    expect((await rl.check('k')).ok).toBe(true);
    const blocked = await rl.check('k');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after the window expires', async () => {
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 0));
    const rl = createInMemoryRateLimiter({ max: 1, windowMs: 1_000 });
    expect((await rl.check('k')).ok).toBe(true);
    expect((await rl.check('k')).ok).toBe(false);
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 2));
    expect((await rl.check('k')).ok).toBe(true);
  });

  it('keys are isolated', async () => {
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 0));
    const rl = createInMemoryRateLimiter({ max: 1, windowMs: 60_000 });
    expect((await rl.check('a')).ok).toBe(true);
    expect((await rl.check('b')).ok).toBe(true);
  });
});
