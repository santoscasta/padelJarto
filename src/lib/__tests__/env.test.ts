import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('returns all required server env vars when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('RESEND_API_KEY', 'resend-key');
    const { getServerEnv } = await import('../env');
    expect(getServerEnv().NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('throws a readable error when a required var is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    const { getServerEnv } = await import('../env');
    expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
