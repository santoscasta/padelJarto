import { CreateWizard } from "@/components/tournament/create-wizard";

export default function NewTournamentPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Nuevo torneo</p>
        <h1 className="mt-1 font-[family:var(--font-display)] text-3xl tracking-tight">
          Crear torneo
        </h1>
        <p className="mt-2 text-sm text-[#d6d3d1]">
          Configura tu torneo paso a paso. Podrás guardarlo como borrador en cualquier momento.
        </p>
      </div>
      <CreateWizard />
    </div>
  );
}
