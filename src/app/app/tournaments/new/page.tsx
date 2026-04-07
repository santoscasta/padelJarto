import { Card } from "@/components/ui/card";
import { createTournamentAction } from "@/app/app/actions";

export default function NewTournamentPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="surface-grid">
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Wizard</p>
        <h1 className="mt-4 font-[family:var(--font-display)] text-4xl tracking-tight">
          Crea un nuevo torneo reusable.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#d6d3d1]">
          El MVP parte de un torneo privado con grupos y cuadro final. Puedes elegir parejas fijas o ranking
          individual, y la app preparará la estructura para invitaciones, clasificación y resultados.
        </p>
      </Card>

      <Card>
        <form action={createTournamentAction} className="grid gap-5">
          <div className="grid gap-2">
            <label className="field-label" htmlFor="name">
              Nombre del torneo
            </label>
            <input className="field-input" id="name" name="name" placeholder="Padel Jarto Primavera" required />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="field-label" htmlFor="startsAt">
                Inicio
              </label>
              <input className="field-input" id="startsAt" name="startsAt" required type="datetime-local" />
            </div>
            <div className="grid gap-2">
              <label className="field-label" htmlFor="endsAt">
                Final
              </label>
              <input className="field-input" id="endsAt" name="endsAt" required type="datetime-local" />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="field-label" htmlFor="location">
              Club o localización
            </label>
            <input className="field-input" id="location" name="location" placeholder="Club Padel La Elipa" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="field-label" htmlFor="mode">
                Modo
              </label>
              <select className="field-select" defaultValue="fixed_pairs" id="mode" name="mode">
                <option value="fixed_pairs">Parejas fijas</option>
                <option value="individual_ranking">Ranking individual</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="field-label" htmlFor="groupCount">
                Número de grupos
              </label>
              <input className="field-input" defaultValue="2" id="groupCount" max="8" min="1" name="groupCount" required type="number" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="field-label" htmlFor="qualifiersPerGroup">
                Clasificados por grupo
              </label>
              <input className="field-input" defaultValue="2" id="qualifiersPerGroup" max="8" min="1" name="qualifiersPerGroup" required type="number" />
            </div>
            <div className="grid gap-2">
              <label className="field-label" htmlFor="knockoutSize">
                Tamaño del cuadro
              </label>
              <input className="field-input" defaultValue="4" id="knockoutSize" max="8" min="2" name="knockoutSize" required type="number" />
            </div>
          </div>

          <button className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-[#f97316] px-6 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c]" type="submit">
            Crear torneo
          </button>
        </form>
      </Card>
    </div>
  );
}
