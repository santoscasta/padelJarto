import { describe, it, expect, beforeEach } from 'vitest';
import { readDispatcherEnv } from './dispatcher-env';

describe('readDispatcherEnv', () => {
  beforeEach(() => {
    delete process.env.NOTIFY_DISPATCHER_URL;
    delete process.env.NOTIFY_DISPATCHER_SECRET;
  });

  it('throws when url missing', () => {
    process.env.NOTIFY_DISPATCHER_SECRET = 's';
    expect(() => readDispatcherEnv()).toThrow(/NOTIFY_DISPATCHER_URL/);
  });

  it('throws when secret missing', () => {
    process.env.NOTIFY_DISPATCHER_URL = 'https://x';
    expect(() => readDispatcherEnv()).toThrow(/NOTIFY_DISPATCHER_SECRET/);
  });

  it('returns both when present', () => {
    process.env.NOTIFY_DISPATCHER_URL = 'https://x';
    process.env.NOTIFY_DISPATCHER_SECRET = 's';
    expect(readDispatcherEnv()).toEqual({ url: 'https://x', key: 's' });
  });
});
