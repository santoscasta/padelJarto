import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck, Swords, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/utils";
import { getTournamentRepository } from "@/lib/repositories";

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();
  const dashboard = await getTournamentRepository().getDashboard(currentUser.id);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="surface-grid overflow-hidden">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Dashboard</p>
          <h1 className="mt-4 font-[family:var(--font-display)] text-4xl tracking-tight">
            {dashboard.currentUser.fullName}, aquí está el estado de tus torneos.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d6d3d1]">
            Vista unificada para organizar grupos, validar resultados y seguir la eliminatoria sin salir del panel.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Torneos</p>
              <p className="mt-3 text-3xl font-semibold">{dashboard.tournaments.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Invitaciones</p>
              <p className="mt-3 text-3xl font-semibold">{dashboard.invitations.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Pendientes</p>
              <p className="mt-3 text-3xl font-semibold">
                {dashboard.tournaments.reduce(
                  (sum, tournament) => sum + tournament.pendingPlayerMatches + tournament.pendingReviewCount,
                  0,
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Atajos</p>
          <div className="mt-5 grid gap-3">
            <Button asChild className="justify-start rounded-2xl" variant="primary">
              <Link href="/app/tournaments/new">
                <Trophy className="mr-2 size-4" />
                Crear torneo
              </Link>
            </Button>
            {dashboard.invitations[0] ? (
              <Button asChild className="justify-start rounded-2xl" variant="secondary">
                <Link href={`/invite/${dashboard.invitations[0].token}`}>
                  <ShieldCheck className="mr-2 size-4" />
                  Revisar invitación pendiente
                </Link>
              </Button>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <div className="space-y-4">
          {dashboard.tournaments.map((summary) => (
            <Card key={summary.tournament.id} className="rounded-[30px]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-[family:var(--font-display)] text-3xl tracking-tight">
                      {summary.tournament.name}
                    </h2>
                    <Badge>
                      {summary.membership.role === "organizer" ? "Organizer" : "Player"}
                    </Badge>
                    <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                      {summary.tournament.mode === "fixed_pairs" ? "Parejas fijas" : "Ranking individual"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-[#d6d3d1]">
                    {formatDateLabel(summary.tournament.startsAt)} · {summary.tournament.location}
                  </p>
                </div>
                <Button asChild className="rounded-full" variant="secondary">
                  <Link href={`/app/tournaments/${summary.tournament.id}`}>
                    Abrir torneo
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Tus partidos</p>
                  <p className="mt-2 text-2xl font-semibold">{summary.pendingPlayerMatches}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Validación</p>
                  <p className="mt-2 text-2xl font-semibold">{summary.pendingReviewCount}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Estado</p>
                  <p className="mt-2 text-2xl font-semibold">{summary.tournament.status}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Qué cubre este MVP</p>
          <div className="mt-5 space-y-4 text-sm text-[#d6d3d1]">
            <div className="flex items-start gap-3">
              <Swords className="mt-0.5 size-4 text-[#fb923c]" />
              <p>Grupos automáticos con edición manual de horario, pista y parejas por partido en modo individual.</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 text-[#fb923c]" />
              <p>Resultados propuestos por jugadores, validados por organizer y recalculados al vuelo.</p>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="mt-0.5 size-4 text-[#fb923c]" />
              <p>Cuadro final automático para parejas fijas y configuración manual para ranking individual.</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
