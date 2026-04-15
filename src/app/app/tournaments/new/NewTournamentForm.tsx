'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { createTournamentAction } from '@/app/app/tournaments/actions';
import { cn } from '@/lib/utils/cn';

const PRESETS = [
  { label: 'Grupo único 6 → SF', size: 6, groupCount: 1, playoffCutoff: 4 },
  { label: 'Grupo único 8 → SF', size: 8, groupCount: 1, playoffCutoff: 4 },
  { label: 'Multi-grupo 8 → SF', size: 8, groupCount: 2, playoffCutoff: 4 },
  { label: 'Multi-grupo 16 → QF', size: 16, groupCount: 4, playoffCutoff: 8 },
] as const;

type FormState = {
  name: string;
  pairingMode: 'pre_inscribed' | 'draw' | 'mixed' | 'owner_picks';
  size: number;
  groupCount: number;
  playoffCutoff: number;
  startsAt: string;
};

export function NewTournamentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    pairingMode: 'owner_picks',
    size: 8,
    groupCount: 2,
    playoffCutoff: 4,
    startsAt: '',
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    setForm((f) => ({
      ...f,
      size: p.size,
      groupCount: p.groupCount,
      playoffCutoff: p.playoffCutoff,
    }));
  }

  function isPresetActive(p: (typeof PRESETS)[number]): boolean {
    return (
      form.size === p.size &&
      form.groupCount === p.groupCount &&
      form.playoffCutoff === p.playoffCutoff
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTournamentAction({
        name: form.name,
        pairingMode: form.pairingMode,
        size: form.size,
        groupCount: form.groupCount,
        playoffCutoff: form.playoffCutoff,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/app/tournaments/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <CardEyebrow>Identidad</CardEyebrow>
        <Field label="Nombre">
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            minLength={3}
            placeholder="Sábado de pádel"
          />
        </Field>
        <Field label="Modo de parejas">
          <Select
            value={form.pairingMode}
            onChange={(e) =>
              update('pairingMode', e.target.value as FormState['pairingMode'])
            }
          >
            <option value="owner_picks">El organizador asigna parejas</option>
            <option value="pre_inscribed">Pre-inscritas</option>
            <option value="draw">Sorteo</option>
            <option value="mixed">Mixto</option>
          </Select>
        </Field>
        <Field label="Inicio (opcional)">
          <Input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => update('startsAt', e.target.value)}
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <CardEyebrow>Presets de cuadro</CardEyebrow>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => {
            const active = isPresetActive(p);
            return (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => applyPreset(p)}
                  aria-pressed={active}
                  className={cn(
                    'w-full cursor-pointer rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors duration-[var(--duration-fast)]',
                    active
                      ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10'
                      : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] hover:border-[color:var(--color-accent)]/40',
                  )}
                >
                  <p className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight">
                    {p.label.split('→')[0].trim()}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">
                    {p.size} parejas · {p.groupCount === 1 ? 'grupo único' : `${p.groupCount} grupos`} · top {p.playoffCutoff}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="grid grid-cols-3 gap-3">
        <Field label="Parejas">
          <Input
            type="number"
            min={2}
            step={1}
            value={form.size}
            onChange={(e) => update('size', Number(e.target.value))}
          />
        </Field>
        <Field label="Grupos">
          <Input
            type="number"
            min={1}
            step={1}
            value={form.groupCount}
            onChange={(e) => update('groupCount', Number(e.target.value))}
          />
        </Field>
        <Field label="Play-off">
          <Select
            value={String(form.playoffCutoff)}
            onChange={(e) => update('playoffCutoff', Number(e.target.value))}
          >
            {[0, 1, 2, 4, 8, 16].map((v) => (
              <option key={v} value={v}>
                {v === 0 ? 'Sin play-off' : `Top ${v}`}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? 'Creando…' : 'Crear torneo'}
      </Button>
    </form>
  );
}
