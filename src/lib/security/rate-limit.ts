export type RateLimitResult =
  | Readonly<{ ok: true; remaining: number }>
  | Readonly<{ ok: false; retryAfterMs: number }>;

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export function createInMemoryRateLimiter(opts: { max: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async check(key) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { ok: true, remaining: opts.max - 1 };
      }
      if (bucket.count >= opts.max) {
        return { ok: false, retryAfterMs: bucket.resetAt - now };
      }
      bucket.count += 1;
      return { ok: true, remaining: opts.max - bucket.count };
    },
  };
}

export function createUpstashRateLimiter(opts: {
  url: string;
  token: string;
  max: number;
  windowMs: number;
}): RateLimiter {
  return {
    async check(key) {
      const headers = {
        authorization: `Bearer ${opts.token}`,
        'content-type': 'application/json',
      };
      const redisKey = `rl:${key}`;
      const incr = await fetch(`${opts.url}/incr/${encodeURIComponent(redisKey)}`, { headers });
      if (!incr.ok) return { ok: true, remaining: opts.max };
      const { result: count } = (await incr.json()) as { result: number };
      if (count === 1) {
        await fetch(`${opts.url}/pexpire/${encodeURIComponent(redisKey)}/${opts.windowMs}`, { headers });
      }
      if (count > opts.max) {
        const ttlRes = await fetch(`${opts.url}/pttl/${encodeURIComponent(redisKey)}`, { headers });
        const { result: ttl } = (await ttlRes.json()) as { result: number };
        return { ok: false, retryAfterMs: Math.max(ttl, 0) };
      }
      return { ok: true, remaining: opts.max - count };
    },
  };
}

let _global: RateLimiter | null = null;
export function getRateLimiter(): RateLimiter {
  if (_global) return _global;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _global = createUpstashRateLimiter({ url, token, max: 10, windowMs: 60_000 });
  } else {
    _global = createInMemoryRateLimiter({ max: 10, windowMs: 60_000 });
  }
  return _global;
}

export function __setRateLimiterForTests(rl: RateLimiter | null) {
  _global = rl;
}
