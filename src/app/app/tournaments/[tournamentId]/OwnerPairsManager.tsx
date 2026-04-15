'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { assignPairAction, unpairAction } from '@/app/app/tournaments/actions';

type InscriptionLite = Readonly<{ playerId: string; pairId: string | null }>;
type PlayerLite = Readonly<{ id: string; displayName: string }>;
type PairLite = Readonly<{ id: string; playerAId: string; playerBId: string }>;

type Props = Readonly<{
  tournamentId: string;
  inscriptions: ReadonlyArray<InscriptionLite>;
  players: ReadonlyArray<PlayerLite>;
  pairs: ReadonlyArray<PairLite>;
}>;

export function OwnerPairsManager({ tournamentId, inscriptions, players, pairs }: Props) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [playerAId, setPlayerAId] = useState<string>('');
  const [playerBId, setPlayerBId] = useState<string>('');

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p] as const)),
    [players],
  );

  const singles = useMemo(
    () => inscriptions.filter((i) => !i.pairId),
    [inscriptions],
  );

  const pairRows = useMemo(() => {
    return pairs.map((pair) => {
      const a = playerById.get(pair.playerAId);
      const b = playerById.get(pair.playerBId);
      return {
        pairId: pair.id,
        nameA: a?.displayName ?? '—',
        nameB: b?.displayName ?? '—',
      };
    });
  }, [pairs, playerById]);

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!playerAId || !playerBId) {
      setErr('Elige dos jugadores');
      return;
    }
    if (playerAId === playerBId) {
      setErr('No puedes emparejar un jugador consigo mismo');
      return;
    }
    start(async () => {
      const res = await assignPairAction({ tournamentId, playerAId, playerBId });
      if (!res.ok) { setErr(res.message); return; }
      setPlayerAId('');
      setPlayerBId('');
      router.refresh();
    });
  }

  function handleUnpair(pairId: string) {
    setErr(null);
    start(async () => {
      const res = await unpairAction({ tournamentId, pairId });
      if (!res.ok) { setErr(res.message); return; }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Sin pareja ({singles.length})</p>
        {singles.length === 0 ? (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            Todos los inscritos tienen pareja asignada.
          </p>
        ) : (
          <form onSubmit={handleAssign} className="flex flex-wrap items-end gap-2">
            <Field label="Jugador A">
              <Select
                value={playerAId}
                onChange={(e) => setPlayerAId(e.target.value)}
                disabled={isPending}
                required
              >
                <option value="">Elige…</option>
                {singles.map((i) => {
                  const p = playerById.get(i.playerId);
                  return (
                    <option key={i.playerId} value={i.playerId}>
                      {p?.displayName ?? i.playerId}
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field label="Jugador B">
              <Select
                value={playerBId}
                onChange={(e) => setPlayerBId(e.target.value)}
                disabled={isPending}
                required
              >
                <option value="">Elige…</option>
                {singles
                  .filter((i) => i.playerId !== playerAId)
                  .map((i) => {
                    const p = playerById.get(i.playerId);
                    return (
                      <option key={i.playerId} value={i.playerId}>
                        {p?.displayName ?? i.playerId}
                      </option>
                    );
                  })}
              </Select>
            </Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Asignando…' : 'Asignar pareja'}
            </Button>
          </form>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Parejas asignadas ({pairRows.length})</p>
        {pairRows.length === 0 ? (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            Aún no has asignado parejas.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {pairRows.map((row) => (
              <li key={row.pairId} className="flex items-center justify-between gap-2">
                <span>{row.nameA} + {row.nameB}</span>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleUnpair(row.pairId)}
                >
                  Deshacer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {err ? <p className="text-sm text-[color:var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
