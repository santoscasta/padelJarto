'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { createTournamentAction } from '@/app/app/tournaments/actions';

const PRESETS = [
  { label: 'Grupo único 6 → SF', size: 6, groupCount: 1, playoffCutoff: 4 },
  { label: 'Grupo único 8 → SF', size: 8, groupCount: 1, playoffCutoff: 4 },
  { label: 'Multi-grupo 8 → SF', size: 8, groupCount: 2, playoffCutoff: 4 },
  { label: 'Multi-grupo 16 → QF', size: 16, groupCount: 4, playoffCutoff: 8 },
] as const;

export function NewTournamentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    pairingMode: 'draw' as 'pre_inscribed' | 'draw' | 'mixed',
    size: 8,
    groupCount: 2,
    playoffCutoff: 4,
    startsAt: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setForm((f) => ({ ...f, size: p.size, groupCount: p.groupCount, playoffCutoff: p.playoffCutoff }));
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
        <Field label="Nombre">
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} required minLength={3} />
        </Field>
        <Field label="Modo de parejas">
          <Select value={form.pairingMode} onChange={(e) => update('pairingMode', e.target.value as typeof form.pairingMode)}>
            <option value="pre_inscribed">Pre-inscritas</option>
            <option value="draw">Sorteo</option>
            <option value="mixed">Mixto</option>
          </Select>
        </Field>
        <Field label="Inicio (opcional)">
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => update('startsAt', e.target.value)} />
        </Field>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium">Presets de cuadro</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} type="button" variant="secondary" size="sm" onClick={() => applyPreset(p)}>
              {p.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="grid grid-cols-3 gap-3">
        <Field label="Parejas">
          <Input
            type="number" min={2} step={1} value={form.size}
            onChange={(e) => update('size', Number(e.target.value))}
          />
        </Field>
        <Field label="Grupos">
          <Input
            type="number" min={1} step={1} value={form.groupCount}
            onChange={(e) => update('groupCount', Number(e.target.value))}
          />
        </Field>
        <Field label="Play-off">
          <Select value={String(form.playoffCutoff)} onChange={(e) => update('playoffCutoff', Number(e.target.value))}>
            {[0, 1, 2, 4, 8, 16].map((v) => <option key={v} value={v}>{v === 0 ? 'Sin play-off' : `Top ${v}`}</option>)}
          </Select>
        </Field>
      </Card>

      {error ? <p className="text-sm text-[color:var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? 'Creando…' : 'Crear torneo'}
      </Button>
    </form>
  );
}
