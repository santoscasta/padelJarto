import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  // Any failure here — env misconfiguration, Supabase network error, malformed
  // cookie jar — should degrade to a /login redirect rather than a 500. The
  // user retries login instead of seeing an opaque Vercel error page.
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url));
    }
    return NextResponse.redirect(new URL(next, request.url));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[auth/callback] unexpected error:', message);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}
