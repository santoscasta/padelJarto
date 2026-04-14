'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import { inscribeFromInviteAction } from './actions';

type Player = { id: string; displayName: string };

export function InviteForm({
  token,
  pairingMode,
  players,
}: {
  token: string;
  pairingMode: 'pre_inscribed' | 'draw' | 'mixed';
  players: ReadonlyArray<Player>;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'solo' | 'with_partner'>(pairingMode === 'pre_inscribed' ? 'with_partner' : 'solo');
  const [partnerId, setPartnerId] = useState<string>('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload = mode === 'with_partner'
        ? { mode: 'with_partner' as const, token, partnerPlayerId: partnerId }
        : { mode: 'solo' as const, token };
      const res = await inscribeFromInviteAction(payload);
      if (!res.ok) { setError(res.message); return; }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {pairingMode === 'mixed' ? (
        <fieldset className="flex gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === 'solo'} onChange={() => setMode('solo')} />
            Me apunto solo
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === 'with_partner'} onChange={() => setMode('with_partner')} />
            Con pareja
          </label>
        </fieldset>
      ) : null}
      {mode === 'with_partner' ? (
        <Field label="Compañero">
          <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
            <option value="">Elige a tu compañero</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </Select>
        </Field>
      ) : null}
      {error ? <p className="text-sm text-[color:var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Inscribiendo…' : 'Inscribirme'}
      </Button>
    </form>
  );
}
