'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { reportResultAction } from './actions';

export function ResultForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [sets, setSets] = useState([
    { a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  function upd(i: number, side: 'a' | 'b', value: string) {
    setSets((s) => s.map((x, j) => (j === i ? { ...x, [side]: value } : x)));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payloadSets = sets
      .map((s) => ({ a: Number(s.a), b: Number(s.b) }))
      .filter((s) => Number.isFinite(s.a) && Number.isFinite(s.b) && (s.a || s.b));
    start(async () => {
      const res = await reportResultAction({ matchId, sets: payloadSets });
      if (!res.ok) { setError(res.message); return; }
      router.refresh();
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {sets.map((s, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Field label={`Set ${i + 1} — pareja A`}>
            <Input inputMode="numeric" pattern="[0-9]*" value={s.a} onChange={(e) => upd(i, 'a', e.target.value)} />
          </Field>
          <Field label={`Set ${i + 1} — pareja B`}>
            <Input inputMode="numeric" pattern="[0-9]*" value={s.b} onChange={(e) => upd(i, 'b', e.target.value)} />
          </Field>
        </div>
      ))}
      {error ? <p className="text-sm text-[color:var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Enviando…' : 'Reportar resultado'}
      </Button>
    </form>
  );
}
