import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ShieldCheck, Trophy, Users } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/Button';

// UX direction: modern dark sports app (Strava / NBA / Nike vibe).
// Block layout, sports typography (Barlow Condensed), green primary + coral spark,
// athletic stat numbers, court-pattern motifs.

export default async function LandingPage() {
  const session = await getSession().catch(() => null);
  if (session) redirect('/app');

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[color:var(--color-bg)] text-[color:var(--color-ink)]">
      <AmbientBackdrop />
      <TopNav />
      <Hero />
      <HowItWorks />
      <FeatureBlocks />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

/* ---------------------------------------------------------------- nav */

function TopNav() {
  return (
    <header className="sticky top-4 z-30 mx-4 sm:mx-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/85 px-4 py-2 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <Wordmark />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium text-[color:var(--color-ink-soft)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)] sm:inline-flex"
          >
            Iniciar sesión
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex cursor-pointer items-center gap-2 text-[color:var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--color-accent)]"
    >
      <LogoMark />
      <span className="font-[family-name:var(--font-display)] font-bold uppercase tracking-tight">
        Padeljarto
      </span>
    </Link>
  );
}

function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="12" cy="12" r="8" />
        <path d="M6 12h12M12 6v12" opacity="0.5" />
      </svg>
    </span>
  );
}

/* --------------------------------------------------------------- hero */

function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pt-16 pb-[var(--space-section)] sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:pt-24"
    >
      <div className="relative z-10 space-y-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-ink-soft)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-accent)]" />
          App privada · solo tu grupo
        </span>

        <h1
          id="hero-heading"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-hero)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em]"
        >
          <span className="block">TORNEOS</span>
          <span className="block text-[color:var(--color-ink-mute)]">DE PADEL</span>
          <span className="block">
            ENTRE{' '}
            <span className="relative inline-block text-[color:var(--color-spark)]">
              AMIGOS
              <svg
                aria-hidden="true"
                viewBox="0 0 220 14"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-[color:var(--color-accent)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              >
                <path d="M4 10 Q60 2 110 7 T 216 6" />
              </svg>
            </span>
          </span>
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-[color:var(--color-ink-soft)] sm:text-xl">
          Crea torneos, empareja jugadores y registra resultados en minutos.
          Sin hojas de cálculo, sin grupos de WhatsApp caóticos.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button asChild size="lg" className="px-8">
            <Link href="/login">Entrar gratis</Link>
          </Button>
          <Link
            href="/login"
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-[color:var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-surface-2)]"
          >
            Ver cómo funciona
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-1"
            />
          </Link>
        </div>

        <dl className="grid max-w-md grid-cols-3 gap-6 pt-6 text-sm">
          <HeroStat value="30s" label="en crear un torneo" />
          <HeroStat value="∞" label="jugadores por grupo" />
          <HeroStat value="0€" label="sin anuncios" />
        </dl>
      </div>

      <HeroVisual />
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-1">
      <dt className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[color:var(--color-accent)]">
        {value}
      </dt>
      <dd className="text-xs leading-snug text-[color:var(--color-ink-soft)]">{label}</dd>
    </div>
  );
}

function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative z-10 mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative aspect-[4/5]">
        {/* Back block — spark coral */}
        <div className="absolute inset-x-6 top-8 bottom-0 -rotate-3 rounded-[var(--radius-block)] bg-[color:var(--color-spark)] opacity-90" />
        {/* Mid block — surface dark with court */}
        <div className="absolute inset-x-0 top-0 bottom-8 rotate-2 rounded-[var(--radius-block)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-8 shadow-[var(--shadow-lift)]">
          <svg
            viewBox="0 0 200 260"
            className="h-full w-full text-[color:var(--color-ink-mute)]/40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <rect x="12" y="12" width="176" height="236" rx="3" />
            <line x1="12" y1="130" x2="188" y2="130" strokeWidth="2.5" />
            <line x1="12" y1="80" x2="188" y2="80" />
            <line x1="12" y1="180" x2="188" y2="180" />
            <line x1="100" y1="80" x2="100" y2="180" />
            <rect x="12" y="12" width="176" height="236" rx="3" strokeDasharray="3 5" opacity="0.5" />
          </svg>
          <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[color:var(--color-accent-ink)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-accent-ink)]" />
            En juego
          </div>
          <div className="absolute right-10 top-[38%] h-10 w-10 rounded-full bg-[color:var(--color-accent)] shadow-[0_6px_20px_-4px_oklch(72%_0.21_145/0.7)]">
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-[color:var(--color-accent-ink)]/40" />
          </div>
        </div>
        {/* Scorecard front */}
        <div className="absolute -bottom-4 -left-2 w-48 rotate-[-4deg] rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] p-4 shadow-[var(--shadow-lift)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-ink-mute)]">
            Final · Grupo A
          </p>
          <div className="mt-2 space-y-1">
            <ScoreRow name="Ana & Marc" score="6–4" winner />
            <ScoreRow name="Laia & Pau" score="4–6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ name, score, winner = false }: { name: string; score: string; winner?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          winner
            ? 'flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink)]'
            : 'flex items-center gap-2 text-sm text-[color:var(--color-ink-soft)]'
        }
      >
        <span
          aria-hidden="true"
          className={`inline-block h-1.5 w-1.5 rounded-full ${winner ? 'bg-[color:var(--color-accent)]' : 'bg-transparent'}`}
        />
        {name}
      </span>
      <span className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">
        {score}
      </span>
    </div>
  );
}

/* -------------------------------------------------------- how it works */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Invita a tu grupo',
      body: 'Envía un enlace privado. Solo entran los que tú quieres.',
      bg: 'bg-[color:var(--color-surface)] border border-[color:var(--color-line)] text-[color:var(--color-ink)]',
      accent: 'text-[color:var(--color-accent)]',
    },
    {
      n: '02',
      title: 'Empareja o sortea',
      body: 'Eliges tú las parejas o dejas que sorteemos. Tú mandas.',
      bg: 'bg-[color:var(--color-spark)] text-[color:var(--color-spark-ink)]',
      accent: 'text-[color:var(--color-spark-ink)]/80',
    },
    {
      n: '03',
      title: 'Juega y puntúa',
      body: 'Grupos, play-off y ranking actualizados al vuelo.',
      bg: 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]',
      accent: 'text-[color:var(--color-accent-ink)]/80',
    },
  ];

  return (
    <section
      aria-labelledby="how-heading"
      className="mx-auto max-w-6xl px-6 py-[var(--space-section)] sm:px-10"
    >
      <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.25em] text-[color:var(--color-ink-mute)]">
        Cómo funciona
      </span>
      <h2
        id="how-heading"
        className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,3vw+1rem,4rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
      >
        De idea a partido<br />
        <span className="text-[color:var(--color-ink-mute)]">en 30 segundos</span>.
      </h2>

      <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.n}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-block)] p-7 transition-transform duration-[var(--duration-normal)] hover:-translate-y-1 ${step.bg}`}
          >
            <div className={`font-[family-name:var(--font-display)] text-7xl font-extrabold leading-none opacity-80 ${step.accent}`}>
              {step.n}
            </div>
            <div className="mt-16">
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm opacity-90">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------ feature blocks */

function FeatureBlocks() {
  const features = [
    {
      Icon: Trophy,
      label: 'Formato',
      title: 'Grupos + play-off',
      body: 'Configura grupos, partidos a ganar y eliminatorias.',
      tone: 'spotlight' as const,
    },
    {
      Icon: Users,
      label: 'Ranking',
      title: 'Clasificación en vivo',
      body: 'Rating ELO actualizado tras cada partido validado.',
      tone: 'default' as const,
    },
    {
      Icon: ShieldCheck,
      label: 'Privado',
      title: 'Solo tu gente',
      body: 'Acceso por enlace. Tu grupo no se cruza con desconocidos.',
      tone: 'default' as const,
    },
  ];
  return (
    <section
      aria-labelledby="features-heading"
      className="mx-auto max-w-6xl px-6 pb-[var(--space-section)] sm:px-10"
    >
      <h2 id="features-heading" className="sr-only">Lo que encontrarás</h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map(({ Icon, label, title, body, tone }) => (
          <li key={title}>
            <article
              className={
                tone === 'spotlight'
                  ? 'flex h-full flex-col gap-4 rounded-[var(--radius-block)] border border-[color:var(--color-accent)]/30 bg-[linear-gradient(180deg,oklch(72%_0.21_145/0.12)_0%,oklch(17%_0.014_260)_70%)] p-7 shadow-[var(--shadow-glow)]'
                  : 'flex h-full flex-col gap-4 rounded-[var(--radius-block)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-7'
              }
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-surface-2)] text-[color:var(--color-accent)]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-ink-mute)]">
                  {label}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">{body}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------- final CTA */

function FinalCta() {
  return (
    <section className="px-4 pb-[var(--space-section)] sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[var(--radius-block)] border border-[color:var(--color-line)] bg-[linear-gradient(135deg,oklch(22%_0.014_260)_0%,oklch(13%_0.012_260)_100%)] px-6 py-16 text-[color:var(--color-ink)] sm:px-12 sm:py-24">
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-4 font-[family-name:var(--font-display)] text-[clamp(6rem,14vw,14rem)] font-extrabold uppercase leading-none tracking-tighter text-[color:var(--color-ink)]/5"
        >
          Padel
        </p>

        <div className="relative max-w-2xl">
          <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.25em] text-[color:var(--color-accent)]">
            Listos
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.5rem,4vw+1rem,5rem)] font-extrabold uppercase leading-[0.9] tracking-tight">
            Monta el torneo<br />
            de <span className="text-[color:var(--color-accent)]">este sábado</span>.
          </h2>
          <p className="mt-5 max-w-md text-lg text-[color:var(--color-ink-soft)]">
            Entras, invitas, jugáis. Así de aburrido —y así de rápido.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="px-8">
              <Link href="/login">Entrar</Link>
            </Button>
            <Link
              href="/login"
              className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)] underline decoration-[color:var(--color-accent)] decoration-2 underline-offset-4 transition-all duration-[var(--duration-fast)] hover:decoration-4"
            >
              O inicia sesión →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- footer */

function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-[color:var(--color-line)] px-6 py-8 text-xs text-[color:var(--color-ink-soft)] sm:flex-row sm:items-center sm:px-10">
      <div className="flex items-center gap-3">
        <LogoMark />
        <span>© {new Date().getFullYear()} Padeljarto</span>
      </div>
      <span>Hecho para jugar, no para trastear.</span>
    </footer>
  );
}

/* -------------------------------------------------------- decoration */

function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -right-40 -top-56 h-[36rem] w-[36rem] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, oklch(72% 0.21 145 / 0.4), transparent 70%)',
        }}
      />
      <div
        className="absolute -left-40 top-40 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, oklch(74% 0.20 35 / 0.35), transparent 70%)',
        }}
      />
    </div>
  );
}
