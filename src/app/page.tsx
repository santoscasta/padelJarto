const features = [
  {
    label: "Organiza",
    title: "Crea torneos en segundos",
    description:
      "Elige formato, numero de pistas y puntos por partido. El calendario se genera automaticamente con rotacion de parejas.",
  },
  {
    label: "Juega",
    title: "Marcadores en tiempo real",
    description:
      "Los jugadores ven la clasificacion y las rondas en directo desde cualquier movil. Perfecto para proyectar en la TV del club.",
  },
  {
    label: "Comparte",
    title: "Un enlace, cero apps",
    description:
      "Comparte el torneo con un QR o un link directo. Sin descargas, sin registros para los jugadores.",
  },
] as const;

const formats = ["Americano", "Liguilla", "Playoffs"] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,#110d0c_0%,#1b1412_50%,#100c0b_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Nav */}
        <header className="flex items-center justify-between rounded-[30px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur">
          <p className="font-[family:var(--font-display)] text-2xl tracking-tight text-[#fff7ed]">
            PadelJarto
          </p>
          <div className="flex gap-3">
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#f97316]/40 bg-[#f97316]/10 px-5 text-sm font-semibold text-[#fdba74] transition hover:bg-[#f97316]/20"
              href="/login"
            >
              Entrar
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#f97316] px-5 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
              href="/login"
            >
              Registrarse
            </a>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-16 text-center sm:mt-24">
          <div className="mx-auto flex flex-wrap justify-center gap-2">
            {formats.map((format) => (
              <span
                key={format}
                className="rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#fdba74]"
              >
                {format}
              </span>
            ))}
          </div>

          <h1 className="mx-auto mt-8 max-w-3xl font-[family:var(--font-display)] text-5xl leading-[0.95] tracking-tight text-[#fff7ed] sm:text-7xl">
            Torneos de padel sin hojas sueltas ni grupos de WhatsApp
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#d6d3d1]">
            Crea el torneo, comparte un enlace con la pena y deja que la app genere el calendario,
            rote las parejas y actualice la clasificacion en directo.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#f97316] px-8 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
              href="/login"
            >
              Crear mi primer torneo
            </a>
            <a
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 text-sm font-semibold text-[#fff7ed] transition hover:bg-white/10"
              href="#como-funciona"
            >
              Como funciona
            </a>
          </div>
        </section>

        {/* Feature cards */}
        <section id="como-funciona" className="mt-20 grid gap-4 sm:mt-28 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.label}
              className="rounded-[28px] border border-white/10 bg-[#14110f]/80 p-6"
            >
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#fdba74]">
                {feature.label}
              </p>
              <h2 className="mt-3 font-[family:var(--font-display)] text-2xl tracking-tight text-[#fff7ed]">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">{feature.description}</p>
            </article>
          ))}
        </section>

        {/* Bottom CTA */}
        <section className="mt-20 rounded-[32px] border border-white/10 bg-[#f97316]/5 px-6 py-12 text-center sm:mt-28 sm:px-10">
          <h2 className="font-[family:var(--font-display)] text-3xl tracking-tight text-[#fff7ed] sm:text-4xl">
            Listo para dejar de apuntar en servilletas?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#d6d3d1]">
            Crea una cuenta gratuita y monta tu primer Americano en menos de un minuto.
          </p>
          <a
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#f97316] px-8 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
            href="/login"
          >
            Empezar gratis
          </a>
        </section>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-xs text-[#a8a29e]">
          PadelJarto -- torneos de padel entre amigos.
        </footer>
      </div>
    </main>
  );
}
