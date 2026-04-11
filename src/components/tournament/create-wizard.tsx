"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const STEPS = [
  { key: "basics", label: "Datos básicos" },
  { key: "format", label: "Formato" },
  { key: "rules", label: "Reglas" },
  { key: "players", label: "Jugadores" },
  { key: "review", label: "Revisión" },
] as const;

interface WizardData {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  format: "liguilla" | "playoff" | "liguilla_playoff";
  pairMode: "fixed" | "variable";
  groups: number;
  playersPerGroup: number;
  courts: number;
  pointsWin: number;
  pointsLoss: number;
  bestOfSets: number;
  validationMode: "rival" | "organizer" | "auto";
  playerNames: string;
}

const DEFAULT_DATA: WizardData = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
  format: "liguilla",
  pairMode: "fixed",
  groups: 1,
  playersPerGroup: 4,
  courts: 2,
  pointsWin: 3,
  pointsLoss: 0,
  bestOfSets: 3,
  validationMode: "rival",
  playerNames: "",
};

export function CreateWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const update = (partial: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...partial }));
  const canNext = step < STEPS.length - 1;
  const canPrev = step > 0;

  const handleSubmit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", data.name);
      fd.set("location", data.location);
      fd.set("startsAt", data.startDate);
      fd.set("endsAt", data.endDate);
      fd.set(
        "mode",
        data.pairMode === "fixed" ? "fixed_pairs" : "individual_ranking",
      );
      fd.set("groupCount", String(data.groups));
      fd.set("qualifiersPerGroup", String(Math.min(2, data.playersPerGroup)));
      fd.set(
        "knockoutSize",
        String(Math.max(2, data.groups * Math.min(2, data.playersPerGroup))),
      );

      const { createTournamentAction } = await import("@/app/app/actions");
      await createTournamentAction(fd);
      router.push("/app/tournaments");
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition ${
                  i < step
                    ? "bg-[#f97316] text-[#1c1917] cursor-pointer"
                    : i === step
                      ? "bg-[#f97316]/20 text-[#f97316] ring-2 ring-[#f97316]"
                      : "bg-white/10 text-[#a8a29e]"
                }`}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-8 sm:w-12 ${i < step ? "bg-[#f97316]" : "bg-white/10"}`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm font-medium text-[#fdba74]">
          {STEPS[step].label}
        </p>
      </div>

      {/* Step content */}
      <Card>
        {step === 0 && (
          <div className="grid gap-4">
            <div>
              <label className="field-label">Nombre del torneo *</label>
              <input
                className="field-input"
                value={data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Torneo de Invierno 2026"
              />
            </div>
            <div>
              <label className="field-label">Sede / Ubicación</label>
              <input
                className="field-input"
                value={data.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="Club de Pádel Madrid"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Fecha inicio</label>
                <input
                  type="datetime-local"
                  className="field-input"
                  value={data.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Fecha fin</label>
                <input
                  type="datetime-local"
                  className="field-input"
                  value={data.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <div>
              <label className="field-label">Formato del torneo</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "liguilla" as const,
                      label: "Liguilla",
                      desc: "Todos contra todos",
                    },
                    {
                      value: "playoff" as const,
                      label: "Playoffs",
                      desc: "Eliminatoria directa",
                    },
                    {
                      value: "liguilla_playoff" as const,
                      label: "Mixto",
                      desc: "Liguilla + eliminatoria",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => update({ format: opt.value })}
                    className={`rounded-xl border p-3 text-left transition ${
                      data.format === opt.value
                        ? "border-[#f97316] bg-[#f97316]/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-[#a8a29e]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Modalidad de parejas</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "fixed" as const,
                      label: "Parejas fijas",
                      desc: "Misma pareja todo el torneo",
                    },
                    {
                      value: "variable" as const,
                      label: "Parejas variables",
                      desc: "Rotación por jornada",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => update({ pairMode: opt.value })}
                    className={`rounded-xl border p-3 text-left transition ${
                      data.pairMode === opt.value
                        ? "border-[#f97316] bg-[#f97316]/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-[#a8a29e]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="field-label">Grupos</label>
                <input
                  type="number"
                  className="field-input"
                  min="1"
                  max="8"
                  value={data.groups}
                  onChange={(e) => update({ groups: +e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Jugadores/grupo</label>
                <input
                  type="number"
                  className="field-input"
                  min="3"
                  max="12"
                  value={data.playersPerGroup}
                  onChange={(e) =>
                    update({ playersPerGroup: +e.target.value })
                  }
                />
              </div>
              <div>
                <label className="field-label">Pistas</label>
                <input
                  type="number"
                  className="field-input"
                  min="1"
                  max="10"
                  value={data.courts}
                  onChange={(e) => update({ courts: +e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Puntos por victoria</label>
                <input
                  type="number"
                  className="field-input"
                  min="1"
                  max="5"
                  value={data.pointsWin}
                  onChange={(e) => update({ pointsWin: +e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Puntos por derrota</label>
                <input
                  type="number"
                  className="field-input"
                  min="0"
                  max="3"
                  value={data.pointsLoss}
                  onChange={(e) => update({ pointsLoss: +e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Sets por partido</label>
              <div className="mt-2 flex gap-2">
                {[1, 3, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => update({ bestOfSets: n })}
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      data.bestOfSets === n
                        ? "border-[#f97316] bg-[#f97316]/10 text-[#fdba74]"
                        : "border-white/10 text-[#a8a29e] hover:border-white/20"
                    }`}
                  >
                    Al mejor de {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Validación de resultados</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "rival" as const,
                      label: "Por rival",
                      desc: "El rival confirma",
                    },
                    {
                      value: "organizer" as const,
                      label: "Organizador",
                      desc: "El organizador valida",
                    },
                    {
                      value: "auto" as const,
                      label: "Automática",
                      desc: "Sin validación",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => update({ validationMode: opt.value })}
                    className={`rounded-xl border p-3 text-left transition ${
                      data.validationMode === opt.value
                        ? "border-[#f97316] bg-[#f97316]/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-[#a8a29e]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <div>
              <label className="field-label">
                Jugadores (uno por línea)
              </label>
              <textarea
                className="field-input min-h-[200px] resize-none font-mono text-sm"
                value={data.playerNames}
                onChange={(e) => update({ playerNames: e.target.value })}
                placeholder={
                  "Santos Castaño\nJavier Ruiz\nMaría García\nAna López\nPedro Díaz\nLaura Torres"
                }
              />
            </div>
            <p className="text-xs text-[#a8a29e]">
              {data.playerNames.split("\n").filter((n) => n.trim()).length}{" "}
              jugadores añadidos
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
              Resumen del torneo
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#a8a29e]">Nombre</p>
                <p className="font-semibold">{data.name || "—"}</p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Ubicación</p>
                <p className="font-semibold">{data.location || "—"}</p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Formato</p>
                <p className="font-semibold capitalize">
                  {data.format.replace("_", " + ")}
                </p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Parejas</p>
                <p className="font-semibold">
                  {data.pairMode === "fixed" ? "Fijas" : "Variables"}
                </p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Puntos victoria</p>
                <p className="font-semibold">{data.pointsWin}</p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Sets</p>
                <p className="font-semibold">Mejor de {data.bestOfSets}</p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Validación</p>
                <p className="font-semibold capitalize">
                  {data.validationMode === "rival"
                    ? "Por rival"
                    : data.validationMode}
                </p>
              </div>
              <div>
                <p className="text-[#a8a29e]">Jugadores</p>
                <p className="font-semibold">
                  {
                    data.playerNames.split("\n").filter((n) => n.trim())
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={!canPrev}
          className={!canPrev ? "invisible" : ""}
        >
          <ChevronLeft className="mr-1 size-4" />
          Anterior
        </Button>

        {canNext ? (
          <Button
            variant="primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 && !data.name.trim()}
          >
            Siguiente
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending || !data.name.trim()}
          >
            {isPending ? "Creando..." : "Crear torneo"}
          </Button>
        )}
      </div>
    </div>
  );
}
