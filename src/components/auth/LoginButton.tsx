'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Status =
  | { kind: 'idle' }
  | { kind: 'google' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

// Named `LoginButton` for backwards-compatible import paths. Offers two sign-in
// paths that both land on /auth/callback?code=... for the session exchange:
//   1) Google OAuth via Supabase (primary) — one click, no inbox roundtrip.
//   2) Magic-link email (fallback) — works when Google OAuth isn't configured
//      or the user prefers email.
export function LoginButton({ next = '/app' }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function redirectTo(): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function onGoogleClick() {
    setStatus({ kind: 'google' });
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setStatus({ kind: 'error', message: error.message });
    }
    // On success the browser is redirected to Google, so no state update here.
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus({ kind: 'sending' });
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus({ kind: 'error', message: error.message });
      return;
    }
    setStatus({ kind: 'sent', email: trimmed });
  }

  if (status.kind === 'sent') {
    return (
      <div className="space-y-3 text-left">
        <p className="text-sm">
          Te hemos enviado un enlace a <strong>{status.email}</strong>. Ábrelo en este dispositivo
          para entrar.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="text-sm underline text-[color:var(--color-ink-soft)]"
        >
          Usar otro email
        </button>
      </div>
    );
  }

  const busy = status.kind === 'google' || status.kind === 'sending';

  return (
    <div className="space-y-4 text-left">
      <Button
        type="button"
        size="lg"
        onClick={onGoogleClick}
        disabled={busy}
        className="w-full"
      >
        {status.kind === 'google' ? 'Redirigiendo...' : 'Entrar con Google'}
      </Button>

      <div className="flex items-center gap-3 text-xs text-[color:var(--color-ink-soft)]">
        <span className="h-px flex-1 bg-black/10" />
        <span>o con email</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="login-email" className="block text-sm">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
        />
        <Button
          type="submit"
          size="lg"
          variant="secondary"
          disabled={busy || !email.trim()}
          className="w-full"
        >
          {status.kind === 'sending' ? 'Enviando...' : 'Enviar enlace de acceso'}
        </Button>
      </form>

      {status.kind === 'error' ? (
        <p className="text-sm text-red-600" role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
