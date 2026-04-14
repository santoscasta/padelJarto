'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

// Named `LoginButton` for backwards-compatible import paths. Renders a
// magic-link email form: Supabase sends a one-time link to the address,
// which redirects to /auth/callback?code=... where the existing handler
// exchanges the code for a session cookie.
export function LoginButton({ next = '/app' }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus({ kind: 'sending' });
    const supabase = createBrowserSupabase();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
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

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
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
        disabled={status.kind === 'sending'}
      />
      <Button type="submit" size="lg" disabled={status.kind === 'sending' || !email.trim()}>
        {status.kind === 'sending' ? 'Enviando...' : 'Enviar enlace de acceso'}
      </Button>
      {status.kind === 'error' ? (
        <p className="text-sm text-red-600" role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
