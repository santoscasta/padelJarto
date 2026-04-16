import Link from 'next/link';
import { LoginButton } from '@/components/auth/LoginButton';
import { Brandmark } from '@/components/ui/Brandmark';

export default function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  return <LoginContent searchParams={searchParams} />;
}

async function LoginContent({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[color:var(--color-bg)] px-6 py-12 text-[color:var(--color-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, oklch(72% 0.21 145 / 0.45), transparent 70%)',
          }}
        />
      </div>

      <Link
        href="/"
        aria-label="Volver al inicio"
        className="absolute left-6 top-6 flex cursor-pointer items-center gap-2.5 text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
      >
        <Brandmark size={36} />
        <span className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-tight">
          Padeljarto
        </span>
      </Link>

      <section
        aria-labelledby="login-heading"
        className="w-full max-w-md space-y-7 rounded-[var(--radius-block)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-7 shadow-[var(--shadow-lift)]"
      >
        <header className="flex flex-col items-center gap-4 text-center">
          <Brandmark size={72} className="shadow-[var(--shadow-glow)]" />
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] px-3 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-ink-soft)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-accent)]" />
            App privada
          </span>
          <h1
            id="login-heading"
            className="font-[family-name:var(--font-display)] text-[clamp(2rem,2vw+1rem,2.75rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
          >
            Entra al<br />
            <span className="text-[color:var(--color-accent)]">vestuario</span>
          </h1>
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            La app de torneos para tu grupo de padel.
          </p>
        </header>

        <LoginButton next={sp.next ?? '/app'} />

        <p className="text-center text-xs text-[color:var(--color-ink-mute)]">
          Sin contraseña, sin spam. Tu email solo se usa para entrar.
        </p>
      </section>
    </main>
  );
}
