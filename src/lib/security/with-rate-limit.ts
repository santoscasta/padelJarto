import type { ActionResult } from '@/lib/domain/action-result';
import { fail } from '@/lib/domain/action-result';
import { getRateLimiter } from './rate-limit';

export function withRateLimit<Args extends unknown[], T>(
  bucket: string,
  fn: (key: string, ...args: Args) => Promise<ActionResult<T>>,
): (key: string, ...args: Args) => Promise<ActionResult<T>> {
  return async (key, ...args) => {
    const rl = getRateLimiter();
    const gate = await rl.check(`${bucket}:${key}`);
    if (!gate.ok) {
      return fail(
        'RATE_LIMITED',
        `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil(gate.retryAfterMs / 1000)}s.`,
      );
    }
    return fn(key, ...args);
  };
}
