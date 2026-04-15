'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportResultAction } from './actions';

const MAX_SETS = 5;
const INITIAL_SETS = [
  { a: '', b: '' },
  { a: '', b: '' },
  { a: '', b: '' },
];

export function ResultForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [sets, setSets] = useState(INITIAL_SETS);
  const [error, setError] = useState<string | null>(null);

  function upd(i: number, side: 'a' | 'b', value: string) {
    setSets((s) => s.map((x, j) => (j === i ? { ...x, [side]: value } : x)));
  }
  function addSet() {
    setSets((s) => (s.length >= MAX_SETS ? s : [...s, { a: '', b: '' }]));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payloadSets = sets
      .map((s) => ({ a: Number(s.a), b: Number(s.b) }))
      .filter((s) => Number.isFinite(s.a) && Number.isFinite(s.b) && (s.a || s.b));
    start(async () => {
      const res = await reportResultAction({ matchId, sets: payloadSets });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ol className="space-y-2">
        {sets.map((s, i) => (
          <li
            key={i}
            className="grid grid-cols-[2.5rem_1fr_auto_1fr] items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] px-3 py-2"
          >
            <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-ink-mute)]">
              S{i + 1}
            </span>
            <Input
              aria-label={`Set ${i + 1} pareja A`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={s.a}
              onChange={(e) => upd(i, 'a', e.target.value)}
              className="text-center font-[family-name:var(--font-display)] text-lg font-bold tabular-nums"
            />
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[color:var(--color-ink-mute)]">
              –
            </span>
            <Input
              aria-label={`Set ${i + 1} pareja B`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={s.b}
              onChange={(e) => upd(i, 'b', e.target.value)}
              className="text-center font-[family-name:var(--font-display)] text-lg font-bold tabular-nums"
            />
          </li>
        ))}
      </ol>

      {sets.length < MAX_SETS ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addSet}
          disabled={isPending}
          className="border border-dashed border-[color:var(--color-line)]"
        >
          <Plus className="h-4 w-4" aria-hidden /> Añadir set
        </Button>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full" size="lg">
        {isPending ? 'Enviando…' : 'Reportar resultado'}
      </Button>
    </form>
  );
}
