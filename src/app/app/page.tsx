import Link from "next/link";
import { Plus, CalendarRange, Trophy, Users, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { listEventsByOrganizer } from "@/lib/repositories/event-repository";
import { hasSupabaseData } from "@/lib/env";
import { formatDateLabel } from "@/lib/utils";

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();
  const events = hasSupabaseData ? await listEventsByOrganizer(currentUser.id) : [];

  // TODO: When invitation-repository is connected, load these from DB
  const pendingInvitations = 0;
  const pendingValidations = 0;
  const upcomingMatches = 0;

  return (
    <div className="grid gap-6">
      {/* Welcome header */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Tu panel</p>
        <h1 className="mt-1 font-[family:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
          Hola, {currentUser.fullName}
        </h1>
        <p className="mt-2 text-sm text-[#d6d3d1]">
          Resumen de tu actividad y acciones pendientes.
        </p>
      </section>

      {/* Priority cards row */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/app/matches">
          <Card className="group h-full transition hover:border-[#f97316]/40">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/20">
                <CalendarRange className="size-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-black">{upcomingMatches}</p>
                <p className="text-xs text-[#a8a29e]">Próximos partidos</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/app/invitations">
          <Card className="group h-full transition hover:border-[#f97316]/40">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-green-500/20">
                <Users className="size-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-black">{pendingInvitations}</p>
                <p className="text-xs text-[#a8a29e]">Invitaciones</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/app/matches">
          <Card className="group h-full transition hover:border-[#f97316]/40">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20">
                <AlertCircle className="size-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-black">{pendingValidations}</p>
                <p className="text-xs text-[#a8a29e]">Por validar</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/app/events/new">
          <Card className="group h-full transition hover:border-[#f97316]/40 bg-[#f97316]/10 border-[#f97316]/20">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#f97316]/30">
                <Plus className="size-5 text-[#f97316]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#fdba74]">Nuevo evento</p>
                <p className="text-xs text-[#a8a29e]">Americano rápido</p>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Quick actions */}
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="surface-grid overflow-hidden">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Acción rápida</p>
          <h2 className="mt-3 font-[family:var(--font-display)] text-2xl tracking-tight">
            Monta tu próximo Americano en 30 segundos
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">
            Crea un evento, añade los nombres de los jugadores y comparte el enlace público para ver la clasificación en vivo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/app/events/new">
                <Plus className="mr-2 size-4" />
                Evento rápido
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/tournaments/new">
                <Trophy className="mr-2 size-4" />
                Torneo completo
              </Link>
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Cómo funciona</p>
          <ol className="mt-4 space-y-3 text-sm text-[#d6d3d1]">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f97316]/20 text-xs font-bold text-[#fdba74]">1</span>
              <span>Crea un evento o torneo con los jugadores.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f97316]/20 text-xs font-bold text-[#fdba74]">2</span>
              <span>El sistema genera rondas y emparejamientos.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f97316]/20 text-xs font-bold text-[#fdba74]">3</span>
              <span>Introduce marcadores desde el móvil.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f97316]/20 text-xs font-bold text-[#fdba74]">4</span>
              <span>Comparte el enlace para seguimiento en vivo.</span>
            </li>
          </ol>
        </Card>
      </section>

      {/* Events list */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Tus eventos</p>
          <span className="text-xs text-[#a8a29e]">{events.length} eventos</span>
        </div>

        {events.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm leading-7 text-[#d6d3d1]">
              Todavía no has creado ningún evento. Crea el primero para empezar.
            </p>
            <div className="mt-4">
              <Button asChild variant="primary">
                <Link href="/app/events/new">
                  <Plus className="mr-2 size-4" />
                  Crear primer evento
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link href={`/app/events/${event.id}`} key={event.id}>
                <Card className="h-full transition hover:border-[#f97316]/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{event.format === "americano" ? "Americano" : "Mexicano"}</Badge>
                    <Badge className="border-white/10 bg-white/5 text-[#fff7ed] capitalize">
                      {event.status}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-[family:var(--font-display)] text-xl tracking-tight">
                    {event.name}
                  </h3>
                  <p className="mt-2 text-xs text-[#a8a29e]">
                    {formatDateLabel(event.createdAt)} · {event.courts}{" "}
                    {event.courts === 1 ? "pista" : "pistas"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
