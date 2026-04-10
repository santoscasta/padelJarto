import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireCurrentUser } from "@/lib/auth/session";
import { getTournamentRepository } from "@/lib/repositories";
import { acceptInvitationAction, rejectInvitationAction } from "@/app/app/actions";

export default async function InvitationsPage() {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const dashboard = await repository.getDashboard(currentUser.id);

  const pendingInvitations = dashboard.invitations.filter(
    (inv) => inv.status === "pending",
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-[family:var(--font-display)] text-3xl tracking-tight text-white">
        Invitaciones
      </h1>
      <p className="mt-2 text-sm text-[#a8a29e]">
        Gestiona tus invitaciones a torneos
      </p>

      <div className="mt-6 space-y-4">
        {pendingInvitations.length === 0 ? (
          <Card className="rounded-2xl">
            <p className="text-center text-sm text-[#a8a29e]">
              No tienes invitaciones pendientes.
            </p>
          </Card>
        ) : (
          pendingInvitations.map((invitation) => (
            <Card key={invitation.id} className="rounded-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <Badge>Pendiente</Badge>
                  <p className="mt-2 text-sm text-[#d6d3d1]">
                    Invitación al torneo
                  </p>
                  <p className="mt-1 text-xs text-[#a8a29e]">
                    Recibida el{" "}
                    {new Date(invitation.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={acceptInvitationAction}>
                    <input type="hidden" name="token" value={invitation.token} />
                    <Button type="submit" variant="primary">
                      Aceptar
                    </Button>
                  </form>
                  <form action={rejectInvitationAction}>
                    <input
                      type="hidden"
                      name="invitationId"
                      value={invitation.id}
                    />
                    <Button type="submit" variant="ghost">
                      Rechazar
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
