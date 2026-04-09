import { redirect } from "next/navigation";
import Image from "next/image";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { hasSupabaseAuth, isDemoEnabled } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { signInAsDemoAction } from "@/app/auth-actions";
import { sanitizeNextPath } from "@/lib/safe-next-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_30%),linear-gradient(180deg,#100c0b_0%,#1a1311_100%)] px-4 py-8 text-[#fff7ed] sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border border-white/10 bg-[#16110f]/85 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[#fdba74]">Acceso al torneo</p>
          <h1 className="mt-5 font-[family:var(--font-display)] text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Entra con tu cuenta y gestiona tu torneo.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#d6d3d1]">
            Crea torneos reutilizables, invita amigos, valida resultados y sigue el cuadro final sin salir de un único panel.
          </p>

          <div className="mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-black/22">
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
              <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Acceso</p>
              <h2 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">
                Email y contraseña
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">
                Entra si ya tienes cuenta, créala si vienes por primera vez, o recupera tu acceso.
              </p>
              <div className="mt-6">
                <AuthForm nextPath={nextPath} />
              </div>
            </Card>
          ) : null}

          {isDemoEnabled ? (
            <Card className="rounded-[32px]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Demo</p>
              <h2 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">
                Explora el MVP
              </h2>
              <div className="mt-6 grid gap-3">
                <form action={signInAsDemoAction}>
                  <input name="session" type="hidden" value="organizer" />
                  <input name="next" type="hidden" value={nextPath} />
                  <button
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-left text-sm font-semibold text-[#fff7ed] transition hover:bg-white/10"
                    type="submit"
                  >
                    Entrar como organizer demo
                  </button>
                </form>
                <form action={signInAsDemoAction}>
                  <input name="session" type="hidden" value="player" />
                  <input name="next" type="hidden" value={nextPath} />
                  <button
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-left text-sm font-semibold text-[#fff7ed] transition hover:bg-white/10"
                    type="submit"
                  >
                    Entrar como player demo
                  </button>
                </form>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
