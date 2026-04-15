import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('proxy CSP', () => {
  it('sets a CSP header with a per-request nonce', async () => {
    const req = new NextRequest('https://padeljarto.app/');
    const res = await proxy(req);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp!).toMatch(/'nonce-[A-Za-z0-9+/=_-]+'/);
    expect(csp!).toMatch(/default-src 'self'/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('exposes the nonce on the response header for layout consumption', async () => {
    const req = new NextRequest('https://padeljarto.app/');
    const res = await proxy(req);
    const nonce = res.headers.get('x-nonce');
    expect(nonce).toMatch(/^[A-Za-z0-9+/=_-]+$/);
  });
});
