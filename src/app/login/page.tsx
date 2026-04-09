import { redirect } from "next/navigation";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Card } from "@/components/ui/card";
import { hasSupabaseAuth, hasSupabaseData, isDemoEnabled } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { signInAsDemoAction } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next ?? "/app";

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_30%),linear-gradient(180deg,#100c0b_0%,#1a1311_100%)] px-4 py-8 text-[#fff7ed] sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border border-white/10 bg-[#16110f]/85 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[#fdba74]">Private access</p>
          <h1 className="mt-5 font-[family:var(--font-display)] text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Entra al torneo con rol de organizador o jugador.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#d6d3d1]">
            {isDemoEnabled
              ? "Si conectas Supabase tendrás login social real. Mientras tanto, el demo te deja revisar el flujo completo de creación, resultados y validación sin configurar nada más."
              : "Configura Supabase completo para ofrecer acceso real con OAuth, persistencia de datos y panel privado sin atajos de demo."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Card className="rounded-[28px] bg-black/25">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Organizer</p>
              <p className="mt-3 text-2xl font-semibold">Control total</p>
              <p className="mt-2 text-sm text-[#d6d3d1]">
                Crea torneos, gestiona invitaciones, genera grupos, valida marcadores y arma el cuadro.
              </p>
            </Card>
            <Card className="rounded-[28px] bg-black/25">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fde68a]">Player</p>
              <p className="mt-3 text-2xl font-semibold">Calendario y resultados</p>
              <p className="mt-2 text-sm text-[#d6d3d1]">
                Consulta tus partidos, la clasificación y sube resultados por sets.
              </p>
            </Card>
          </div>
        </section>

        <div className="space-y-5">
          <Card className="rounded-[32px]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Supabase Auth</p>
            <h2 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">Google y Apple</h2>
            <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">
              {hasSupabaseData
                ? "La configuración pública y server-side de Supabase está lista. Puedes autenticarte con OAuth."
                : hasSupabaseAuth
                  ? "Falta SUPABASE_SERVICE_ROLE_KEY. No se ofrece OAuth hasta completar la configuración server-side."
                  : "Configura NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY para activar el modo Supabase completo."}
            </p>
            {hasSupabaseData ? (
              <div className="mt-6">
                <OAuthButtons nextPath={nextPath} />
              </div>
            ) : null}
          </Card>

          <Card className="rounded-[32px]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
              {isDemoEnabled ? "Demo instantánea" : "Acceso restringido"}
            </p>
            <h2 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">
              {isDemoEnabled ? "Explora el MVP ya" : "Solo modo real"}
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
                El modo demo está desactivado. Para entrar necesitas la configuración completa de Supabase.
              </p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
