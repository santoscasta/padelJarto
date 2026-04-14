import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryRateLimiter, __setRateLimiterForTests } from './rate-limit';
import { withRateLimit } from './with-rate-limit';

describe('withRateLimit', () => {
  beforeEach(() => {
    __setRateLimiterForTests(createInMemoryRateLimiter({ max: 2, windowMs: 60_000 }));
  });

  it('returns RATE_LIMITED once limit exceeded', async () => {
    const action = withRateLimit('test', async () => ({ ok: true as const, data: 1 }));
    expect((await action('user-1')).ok).toBe(true);
    expect((await action('user-1')).ok).toBe(true);
    const third = await action('user-1');
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.code).toBe('RATE_LIMITED');
  });
});
