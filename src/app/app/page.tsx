import Link from "next/link";
import { Plus } from "lucide-react";
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

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="surface-grid overflow-hidden">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Tu panel</p>
          <h1 className="mt-4 font-[family:var(--font-display)] text-4xl tracking-tight">
            Hola {currentUser.fullName}. Monta tu próximo Americano en 30 segundos.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d6d3d1]">
            Crea un evento, añade los nombres de los jugadores y comparte el enlace público para ver la clasificación en vivo.
          </p>
          <div className="mt-6">
            <Button asChild variant="primary">
              <Link href="/app/events/new">
                <Plus className="mr-2 size-4" />
                Nuevo evento
              </Link>
            </Button>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Cómo funciona</p>
          <ol className="mt-5 space-y-4 text-sm text-[#d6d3d1]">
            <li>
              <span className="font-semibold text-[#fff7ed]">1.</span> Crea un evento con los nombres de los jugadores.
            </li>
            <li>
              <span className="font-semibold text-[#fff7ed]">2.</span> El generador propone las rondas con rotación de parejas.
            </li>
            <li>
              <span className="font-semibold text-[#fff7ed]">3.</span> Ve introduciendo los marcadores desde el móvil.
            </li>
            <li>
              <span className="font-semibold text-[#fff7ed]">4.</span> Comparte el enlace público para que todos lo vean en vivo.
            </li>
          </ol>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Tus eventos</p>
          <span className="text-xs text-[#a8a29e]">{events.length} eventos</span>
        </div>

        {events.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm leading-7 text-[#d6d3d1]">
              Todavía no has creado ningún evento. Crea el primero para empezar a jugar.
            </p>
            <div className="mt-4">
              <Button asChild variant="primary">
                <Link href="/app/events/new">
                  <Plus className="mr-2 size-4" />
                  Crear el primer evento
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
                  <h2 className="mt-3 font-[family:var(--font-display)] text-2xl tracking-tight">
                    {event.name}
                  </h2>
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
