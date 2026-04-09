import Image from "next/image";

const features = [
  [
    "Torneos reutilizables",
    "Crea nuevos torneos en la misma app y conserva el historico para repetir formatos sin rehacer todo.",
  ],
  [
    "Parejas fijas o ranking individual",
    "Dos modos claros para jugar ya: parejas fijas completas y flujo listo para ranking con parejas variables.",
  ],
  [
    "Supabase-ready",
    "Auth social con Google y Apple, datos listos para vivir en Supabase y despliegue directo en Vercel.",
  ],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,#110d0c_0%,#1b1412_50%,#100c0b_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4 rounded-[30px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-[family:var(--font-display)] text-3xl tracking-tight text-[#fff7ed]">PadelJarto</p>
            <p className="text-sm text-[#d6d3d1]">App privada para montar torneos de pádel entre amigos sin hojas sueltas.</p>
          </div>
          <div className="flex gap-3">
            <a
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#f97316]/40 bg-[#f97316]/10 px-5 text-sm font-semibold text-[#fdba74] transition hover:bg-[#f97316]/20"
              href="/login"
            >
              Entrar
            </a>
            <a
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#f97316] px-5 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
              href="/app"
            >
              Ver dashboard
            </a>
          </div>
        </header>

        <section className="surface-grid relative mt-8 overflow-hidden rounded-[38px] border border-white/10 bg-[#16110f]/85 px-6 py-10 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:px-10 sm:py-14">
          <div className="absolute right-[-4rem] top-[-4rem] size-40 rounded-full bg-[#f97316]/20 blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[-3rem] size-52 rounded-full bg-[#facc15]/10 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[#fdba74]">
                Grupos + eliminatoria
              </span>
              <h1 className="max-w-3xl font-[family:var(--font-display)] text-5xl leading-[0.95] tracking-tight text-[#fff7ed] sm:text-7xl">
                Monta tu torneo de pádel sin perseguir resultados por WhatsApp.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#e7e5e4]">
                Crea el torneo, invita a la peña, genera grupos, deja que los jugadores suban marcadores
                y valida el cuadro final desde un único panel.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#f97316] px-6 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
                  href="/login"
                >
                  Configurar acceso
                </a>
                <a
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-[#fff7ed] transition hover:bg-white/10"
                  href="#features"
                >
                  Ver funcionalidades
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-12 top-12 h-28 rounded-full bg-[#f97316]/18 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#120e0d]/92 p-3 shadow-[0_28px_120px_rgba(0,0,0,0.34)] sm:p-4">
                <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#fdba74]">
                      Live layout
                    </p>
                    <p className="mt-1 text-sm text-[#fff7ed]">Del grupo al cuadro final sin salir del panel</p>
                  </div>
                  <div className="inline-flex w-fit rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe7d0]">
                    2 grupos · 6 parejas
                  </div>
                </div>

                <div className="relative mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[#0d0a09]">
                  <Image
                    alt="Ilustracion del flujo de torneo con pista, invitaciones y cuadro final."
                    className="h-auto w-full"
                    height={900}
                    priority
                    src="/images/home-hero-court.svg"
                    width={1200}
                  />
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap gap-3">
                    <div className="rounded-[22px] border border-white/12 bg-[#120d0c]/78 px-4 py-3 backdrop-blur">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#fdba74]">
                        Organizer view
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#fff7ed]">2 torneos activos</p>
                    </div>
                    <div className="rounded-[22px] border border-white/12 bg-[#10141d]/72 px-4 py-3 backdrop-blur">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#fde68a]">
                        Player flow
                      </p>
                      <p className="mt-2 text-base font-semibold text-[#fff7ed]">Resultado por sets + validacion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-10 grid gap-4 lg:grid-cols-3">
          {features.map(([title, description]) => (
            <article
              key={title}
              className="rounded-[28px] border border-white/10 bg-[#14110f]/80 p-6"
            >
              <h2 className="font-[family:var(--font-display)] text-2xl tracking-tight text-[#fff7ed]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
