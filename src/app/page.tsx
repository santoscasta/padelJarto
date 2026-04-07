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
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
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

            <div className="grid gap-4">
              <article className="rounded-[28px] border border-white/10 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Organizer view</p>
                <p className="mt-3 text-3xl font-semibold text-[#fff7ed]">2 torneos activos</p>
                <p className="mt-2 text-sm text-[#d6d3d1]">Invitaciones privadas, cola de validación y cuadro final manual o automático.</p>
              </article>
              <article className="rounded-[28px] border border-white/10 bg-[#1f2937]/40 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#fde68a]">Player flow</p>
                <p className="mt-3 text-3xl font-semibold text-[#fff7ed]">Resultado por sets</p>
                <p className="mt-2 text-sm text-[#d6d3d1]">Cada jugador propone marcador y el organizador decide cuándo queda oficial.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            ["Torneos reutilizables", "Crea nuevos torneos en la misma app y conserva el histórico."],
            ["Parejas fijas o ranking individual", "Flujo completo para parejas fijas y preparación real para parejas variables con ranking individual."],
            ["Supabase-ready", "Auth social con Google y Apple, datos listos para vivir en Supabase y despliegue directo en Vercel."],
          ].map(([title, description]) => (
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
