import { redirect } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { hasSupabaseAuth, isDemoEnabled } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import {
  signInAsDemoAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/app/auth-actions";
import { sanitizeNextPath } from "@/lib/safe-next-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);
  const mode = resolvedSearchParams.sent === "confirm" ? "confirm" : "none";
  const errorCode = resolvedSearchParams.error;
  const errorMessage =
    errorCode === "invalid_credentials"
      ? "Email o contraseña incorrectos."
      : errorCode === "weak_password"
        ? "La contraseña debe tener al menos 6 caracteres."
        : errorCode === "missing_fields"
          ? "Completa email y contraseña."
          : errorCode === "signup_failed"
            ? "No se pudo crear la cuenta. Prueba con otro email."
            : errorCode
              ? "Acceso no disponible."
              : null;

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_30%),linear-gradient(180deg,#100c0b_0%,#1a1311_100%)] px-4 py-8 text-[#fff7ed] sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border border-white/10 bg-[#16110f]/85 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[#fdba74]">Acceso al torneo</p>
          <h1 className="mt-5 font-[family:var(--font-display)] text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Entra con tu invitación y tu rol listo para jugar.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#d6d3d1]">
            {isDemoEnabled
              ? "Si conectas Supabase tendrás acceso real con login social. Mientras tanto, el demo te deja recorrer la creación del torneo, los resultados y la validación sin bloquearte."
              : "Accede desde un único panel para gestionar el torneo, revisar partidos, validar marcadores y mover todo el flujo sin salir de la app."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Card className="rounded-[28px] bg-black/25">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Organizador</p>
              <p className="mt-3 text-2xl font-semibold">Todo bajo control</p>
              <p className="mt-2 text-sm text-[#d6d3d1]">
                Crea torneos, invita por enlace o email, genera grupos, valida marcadores y monta el cuadro final.
              </p>
            </Card>
            <Card className="rounded-[28px] bg-black/25">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fde68a]">Jugador</p>
              <p className="mt-3 text-2xl font-semibold">Tus partidos a mano</p>
              <p className="mt-2 text-sm text-[#d6d3d1]">
                Consulta el calendario, revisa la clasificación y sube resultados por sets sin salir del torneo.
              </p>
            </Card>
          </div>

          <div className="mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-black/22">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#fdba74]">
                  Recorrido
                </p>
                <p className="mt-1 text-sm text-[#fff7ed]">
                  Invitación, acceso y validación conectados en un mismo flujo.
                </p>
              </div>
              <div className="inline-flex w-fit rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#ffe7d0]">
                Acceso privado
              </div>
            </div>
            <Image
              alt="Ilustración del recorrido de acceso con invitación, inicio de sesión y aprobación."
              className="h-auto w-full"
              height={900}
              priority
              src="/images/login-access-flow.svg"
              width={1200}
            />
          </div>
        </section>

        <div className="space-y-5">
          {hasSupabaseAuth ? (
            <Card className="rounded-[32px]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Acceso con cuenta</p>
              <h2 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">
                Email y contraseña
              </h2>
              <form action={signInWithPasswordAction} className="mt-6 space-y-3">
                <input name="next" type="hidden" value={nextPath} />
                <input
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
                  name="email"
                  placeholder="tu@email.com"
                  required
                  type="email"
                />
                <input
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
                  minLength={6}
                  name="password"
                  placeholder="Contraseña"
                  required
                  type="password"
                />
                <button
                  className="w-full rounded-2xl bg-[#f97316] px-5 py-4 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
                  type="submit"
                >
                  Entrar
                </button>
              </form>
              <form action={signUpWithPasswordAction} className="mt-3 space-y-3 border-t border-white/10 pt-4">
                <input name="next" type="hidden" value={nextPath} />
                <p className="text-xs uppercase tracking-[0.2em] text-[#fde68a]">¿Primera vez?</p>
                <input
                  autoComplete="name"
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
                  name="full_name"
                  placeholder="Tu nombre"
                  type="text"
                />
                <input
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
                  name="email"
                  placeholder="tu@email.com"
                  required
                  type="email"
                />
                <input
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
                  minLength={6}
                  name="password"
                  placeholder="Contraseña (mín. 6)"
                  required
                  type="password"
                />
                <button
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm font-semibold text-[#fff7ed] transition hover:bg-white/10"
                  type="submit"
                >
                  Crear cuenta
                </button>
              </form>
              {mode === "confirm" ? (
                <p className="mt-3 text-sm text-[#bbf7d0]">
                  Cuenta creada. Si se pide confirmación, revisa tu email.
                </p>
              ) : null}
              {errorMessage ? (
                <p className="mt-3 text-sm text-[#fecaca]">{errorMessage}</p>
              ) : null}
            </Card>
          ) : null}

          <Card className="rounded-[32px]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
              {isDemoEnabled ? "Demo instantánea" : "Acceso privado"}
            </p>
            <h2 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">
              {isDemoEnabled ? "Explora el MVP ya" : "Solo con invitación"}
            </h2>
            {isDemoEnabled ? (
              <div className="mt-6 grid gap-3">
                <form action={signInAsDemoAction}>
                  <input name="session" type="hidden" value="organizer" />
                  <input name="next" type="hidden" value={nextPath} />
                  <button className="w-full rounded-2xl bg-[#f97316] px-5 py-4 text-left text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]" type="submit">
                    Entrar como organizer demo
                  </button>
                </form>
                <form action={signInAsDemoAction}>
                  <input name="session" type="hidden" value="player" />
                  <input name="next" type="hidden" value={nextPath} />
                  <button className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-left text-sm font-semibold text-[#fff7ed] transition hover:bg-white/10" type="submit">
                    Entrar como player demo
                  </button>
                </form>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">
                Este entorno no ofrece modo demo. Cuando el acceso esté activo, entrarás con tu cuenta y la invitación del torneo.
              </p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
