import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
  ].join('; ');

  response.headers.set('content-security-policy', csp);
  response.headers.set('x-nonce', nonce);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'DENY');
  return response;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = generateNonce();

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = supabaseConfigured
    ? await updateSession(request)
    : NextResponse.next({ request });

  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    // Exclude static assets and the service worker.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|webp|ico)$).*)',
  ],
};
