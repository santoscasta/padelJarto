import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationByToken } from "@/lib/repositories/invitation-repository";
import {
  acceptInvitationAction,
  rejectInvitationAction,
} from "@/app/app/invitations/actions";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  if (!invitation) notFound();

  const user = await getCurrentUser();
  const isExpired =
    invitation.expires_at && new Date(invitation.expires_at) < new Date();
  const isPending = invitation.status === "pending" && !isExpired;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_30%),linear-gradient(180deg,#0a0807_0%,#150f0d_100%)] px-4 py-8 text-[#fff7ed]">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#f97316] text-2xl font-black text-[#1c1917]">
              PJ
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
              Invitacion a torneo
            </p>
            <h1 className="mt-2 font-[family:var(--font-display)] text-3xl tracking-tight">
              {invitation.tournaments?.name ?? "Torneo de padel"}
            </h1>
            {invitation.tournaments?.format && (
              <div className="mt-3">
                <Badge>{invitation.tournaments.format}</Badge>
              </div>
            )}
            {invitation.message && (
              <p className="mt-4 text-sm italic text-[#d6d3d1]">
                &ldquo;{invitation.message}&rdquo;
              </p>
            )}
          </div>

          {!isPending ? (
            <div className="mt-6 text-center">
              <Badge
                className={
                  invitation.status === "accepted"
                    ? "border-green-500/30 bg-green-500/20 text-green-400"
                    : isExpired
                      ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                      : "border-red-500/30 bg-red-500/20 text-red-400"
                }
              >
                {invitation.status === "accepted"
                  ? "Ya aceptada"
                  : isExpired
                    ? "Invitacion caducada"
                    : invitation.status === "rejected"
                      ? "Rechazada"
                      : "No disponible"}
              </Badge>
              <div className="mt-4">
                <Button asChild variant="ghost">
                  <Link href={user ? "/app" : "/login"}>
                    {user ? "Ir al panel" : "Iniciar sesion"}
                  </Link>
                </Button>
              </div>
            </div>
          ) : user ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <form action={acceptInvitationAction}>
                <input type="hidden" name="token" value={token} />
                <Button type="submit" variant="primary">
                  Aceptar invitacion
                </Button>
              </form>
              <form action={rejectInvitationAction}>
                <input type="hidden" name="token" value={token} />
                <Button type="submit" variant="ghost">
                  Rechazar
                </Button>
              </form>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <p className="mb-4 text-sm text-[#d6d3d1]">
                Inicia sesion para responder a la invitacion
              </p>
              <Button asChild variant="primary">
                <Link href={`/login?redirect=/invite/${token}`}>
                  Iniciar sesion
                </Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
