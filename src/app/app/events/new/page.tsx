import { Card } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { createEventAction } from "@/app/app/events/actions";

export default async function NewEventPage() {
  await requireCurrentUser();

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Evento rápido</p>
        <h1 className="mt-3 font-[family:var(--font-display)] text-4xl tracking-tight">
          Monta un Americano en 30 segundos
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">
          Añade a los jugadores, elige las pistas disponibles y el generador propone el calendario con rotación de parejas.
        </p>

        <form action={createEventAction} className="mt-8 space-y-6">
          <div className="grid gap-2">
            <label className="field-label" htmlFor="name">Nombre</label>
            <input
              className="field-input"
              defaultValue="Padel Jueves"
              id="name"
              name="name"
              placeholder="Padel Jueves"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="field-label" htmlFor="format">Formato</label>
              <select className="field-select" defaultValue="americano" id="format" name="format">
                <option value="americano">Americano</option>
                <option disabled value="mexicano">Mexicano (próximamente)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="field-label" htmlFor="courts">Pistas</label>
              <input
                className="field-input"
                defaultValue="2"
                id="courts"
                max="8"
                min="1"
                name="courts"
                required
                type="number"
              />
            </div>
            <div className="grid gap-2">
              <label className="field-label" htmlFor="pointsPerMatch">Puntos / partido</label>
              <input
                className="field-input"
                defaultValue="24"
                id="pointsPerMatch"
                max="60"
                min="6"
                name="pointsPerMatch"
                required
                type="number"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="field-label" htmlFor="players">Jugadores (uno por línea o separados por comas)</label>
            <textarea
              className="field-input min-h-[180px] leading-7"
              defaultValue={"Santi\nMarta\nLuis\nAna\nPedro\nEva\nToni\nSilvia"}
              id="players"
              name="players"
              required
            />
            <p className="text-xs text-[#a8a29e]">Mínimo 4 jugadores. Ideal: múltiplos de 4.</p>
          </div>

          <label className="flex items-center gap-3 text-sm text-[#d6d3d1]">
            <input defaultChecked name="autoGenerate" type="checkbox" />
            Generar calendario automáticamente al crear
          </label>

          <button
            className="w-full rounded-2xl bg-[#f97316] px-6 py-4 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]"
            type="submit"
          >
            Crear evento
          </button>
        </form>
      </Card>
    </div>
  );
}
