'use client';
import { Button } from '@/components/ui/Button';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function LoginButton({ next = '/app' }: { next?: string }) {
  async function onClick() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }
  return (
    <Button onClick={onClick} size="lg">
      Entrar con Google
    </Button>
  );
}
