import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getTournamentRepository } from "@/lib/repositories";
import { acceptInvitationAction } from "@/app/app/actions";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getTournamentRepository().getInvitationByToken(token);
  const currentUser = await getCurrentUser();

  if (!invitation) {
    notFound();
  }

  if (!currentUser) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 sm:px-6">
        <Card className="rounded-[34px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Invitación privada</p>
          <h1 className="mt-4 font-[family:var(--font-display)] text-4xl tracking-tight">Necesitas iniciar sesión para aceptar esta invitación.</h1>
          <p className="mt-4 text-sm leading-7 text-[#d6d3d1]">
            Cuando entres, podrás aceptar el acceso al torneo con este enlace.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/login?next=/invite/${token}`}>Ir a login</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 sm:px-6">
      <Card className="rounded-[34px]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Invitación privada</p>
        <h1 className="mt-4 font-[family:var(--font-display)] text-4xl tracking-tight">
          Acepta tu plaza en el torneo.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#d6d3d1]">
          La invitación usa el token <span className="font-mono text-[#fff7ed]">{invitation.token}</span>. Al aceptarla,
          entrarás como jugador y verás el torneo dentro del dashboard.
        </p>
        <form action={acceptInvitationAction} className="mt-8">
          <input name="token" type="hidden" value={invitation.token} />
          <Button type="submit">Aceptar invitación</Button>
        </form>
      </Card>
    </main>
  );
}
