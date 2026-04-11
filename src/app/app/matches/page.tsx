import { Card } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function MatchesPage() {
  const _currentUser = await requireCurrentUser();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Partidos</p>
        <h1 className="mt-1 font-[family:var(--font-display)] text-3xl tracking-tight">
          Mis partidos
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Pendientes</p>
          <p className="mt-4 text-4xl font-black text-[#fff7ed]">0</p>
          <p className="mt-1 text-xs text-[#a8a29e]">partidos por jugar</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Por validar</p>
          <p className="mt-4 text-4xl font-black text-[#fff7ed]">0</p>
          <p className="mt-1 text-xs text-[#a8a29e]">resultados pendientes</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Jugados</p>
          <p className="mt-4 text-4xl font-black text-[#fff7ed]">0</p>
          <p className="mt-1 text-xs text-[#a8a29e]">partidos completados</p>
        </Card>
      </div>

      <Card>
        <p className="text-sm text-[#d6d3d1]">
          Cuando participes en torneos, aquí verás todos tus partidos, pendientes de jugar y resultados por validar.
        </p>
      </Card>
    </div>
  );
}
