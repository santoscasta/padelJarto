import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function TournamentsPage() {
  const _currentUser = await requireCurrentUser();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Torneos</p>
          <h1 className="mt-1 font-[family:var(--font-display)] text-3xl tracking-tight">
            Mis torneos
          </h1>
        </div>
        <Button asChild variant="primary">
          <Link href="/app/tournaments/new">
            <Plus className="mr-2 size-4" />
            Nuevo torneo
          </Link>
        </Button>
      </div>

      <Card>
        <p className="text-sm text-[#d6d3d1]">
          Aquí aparecerán tus torneos con formato de liguilla, playoff o mixto.
        </p>
        <div className="mt-4">
          <Button asChild variant="primary">
            <Link href="/app/tournaments/new">
              <Plus className="mr-2 size-4" />
              Crear primer torneo
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
