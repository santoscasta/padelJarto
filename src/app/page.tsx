import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/Button';

export default async function LandingPage() {
  // If someone lands on "/" already signed in, skip the welcome screen.
  const session = await getSession().catch(() => null);
  if (session) {
    redirect('/app');
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[color:var(--color-surface)]">
      <CourtBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between">
          <Wordmark />
          <Link
            href="/login"
            className="text-sm font-medium text-[color:var(--color-ink-soft)] underline-offset-4 hover:text-[color:var(--color-ink)] hover:underline"
          >
            Iniciar sesión
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-start justify-center gap-10 py-16 sm:py-24">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-[color:var(--color-ink-soft)] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
              App privada para tu grupo
            </span>

            <h1 className="text-[clamp(2.75rem,5vw+1rem,5.5rem)] font-semibold leading-[0.95] tracking-tight">
              Torneos de padel
              <br />
              <span className="italic text-[color:var(--color-accent)]">entre amigos</span>.
            </h1>

            <p className="max-w-lg text-lg text-[color:var(--color-ink-soft)]">
              Organiza grupos, empareja jugadores y registra resultados sin hojas de cálculo ni
              grupos de WhatsApp caóticos. En 30 segundos.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" className="shadow-[0_10px_30px_-10px_oklch(62%_0.19_150/0.6)]">
                <Link href="/login">Entrar</Link>
              </Button>
              <Link
                href="/login"
                className="text-sm font-medium text-[color:var(--color-ink)] underline decoration-[color:var(--color-accent)] decoration-2 underline-offset-4 hover:decoration-4"
              >
                Crear cuenta gratis →
              </Link>
            </div>
          </div>

          <ValueProps />
        </section>

        <footer className="flex items-center justify-between border-t border-black/5 pt-6 text-xs text-[color:var(--color-ink-soft)]">
          <span>© {new Date().getFullYear()} Padeljarto</span>
          <span className="hidden sm:inline">Hecho para jugar, no para trastear.</span>
        </footer>
      </div>
    </main>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="10" cy="10" r="6" />
          <path d="M10 4v12M4 10h12" />
        </svg>
      </span>
      <span>Padeljarto</span>
    </Link>
  );
}

function ValueProps() {
  const items = [
    {
      n: '01',
      title: 'Invita a tu grupo',
      body: 'Envía un link privado. Sólo entran los que tú quieres.',
    },
    {
      n: '02',
      title: 'Empareja a mano',
      body: 'O deja que sorteemos las parejas. Tú eliges el formato.',
    },
    {
      n: '03',
      title: 'Juega y puntúa',
      body: 'Grupos, play-off y ranking actualizados al vuelo.',
    },
  ];

  return (
    <ul className="grid w-full grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-black/5 bg-black/5 sm:grid-cols-3">
      {items.map((it) => (
        <li
          key={it.n}
          className="bg-white/80 p-6 backdrop-blur transition-colors hover:bg-white"
        >
          <div className="mb-4 font-mono text-xs tracking-[0.2em] text-[color:var(--color-accent)]">
            {it.n}
          </div>
          <h3 className="mb-1 text-base font-semibold">{it.title}</h3>
          <p className="text-sm text-[color:var(--color-ink-soft)]">{it.body}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Abstract padel-court backdrop rendered as an inline SVG.
 * Decorative only — aria-hidden and pointer-events-none so it never blocks UI.
 */
function CourtBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft accent glow top-right */}
      <div
        className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, oklch(62% 0.19 150 / 0.55), transparent 70%)',
        }}
      />
      {/* Subtle court lines bottom-left */}
      <svg
        className="absolute -bottom-24 -left-24 h-[40rem] w-[40rem] opacity-[0.07]"
        viewBox="0 0 400 400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <rect x="40" y="40" width="320" height="320" rx="6" />
        <line x1="40" y1="200" x2="360" y2="200" />
        <line x1="200" y1="40" x2="200" y2="360" />
        <rect x="40" y="140" width="320" height="120" />
        <circle cx="200" cy="200" r="18" />
      </svg>
      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />
    </div>
  );
}
