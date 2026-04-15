'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { PairLine } from '@/components/ui/PairLine';
import { assignPairAction, unpairAction } from '@/app/app/tournaments/actions';

type InscriptionLite = Readonly<{ playerId: string; pairId: string | null }>;
type PlayerLite = Readonly<{
  id: string;
  displayName: string;
  avatarUrl: string | null;
}>;
type PairLite = Readonly<{ id: string; playerAId: string; playerBId: string }>;

type Props = Readonly<{
  tournamentId: string;
  inscriptions: ReadonlyArray<InscriptionLite>;
  players: ReadonlyArray<PlayerLite>;
  pairs: ReadonlyArray<PairLite>;
}>;

export function OwnerPairsManager({
  tournamentId,
  inscriptions,
  players,
  pairs,
}: Props) {
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
      const res = await assignPairAction({
        tournamentId,
        playerAId,
        playerBId,
      });
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setPlayerAId('');
      setPlayerBId('');
      router.refresh();
    });
  }

  function handleUnpair(pairId: string) {
    setErr(null);
    start(async () => {
      const res = await unpairAction({ tournamentId, pairId });
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Singles + assignment form */}
      <div className="space-y-3">
        <p className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight">
          Sin pareja{' '}
          <span className="ml-1 text-[color:var(--color-ink-mute)] tabular-nums">
            {singles.length}
          </span>
        </p>

        {singles.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-line)] p-4 text-center text-sm text-[color:var(--color-ink-soft)]">
            Todos los inscritos tienen pareja.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {singles.map((i) => {
                const p = playerById.get(i.playerId);
                return (
                  <li
                    key={i.playerId}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] py-1 pl-1 pr-3"
                  >
                    <Avatar
                      src={p?.avatarUrl ?? null}
                      name={p?.displayName ?? '—'}
                      size="xs"
                    />
                    <span className="text-sm">{p?.displayName ?? i.playerId}</span>
                  </li>
                );
              })}
            </ul>

            <form
              onSubmit={handleAssign}
              className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
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
                <Users className="h-4 w-4" aria-hidden />
                {isPending ? 'Asignando…' : 'Emparejar'}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Assigned pairs */}
      <div className="space-y-3">
        <p className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight">
          Parejas asignadas{' '}
          <span className="ml-1 text-[color:var(--color-ink-mute)] tabular-nums">
            {pairs.length}
          </span>
        </p>
        {pairs.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-line)] p-4 text-center text-sm text-[color:var(--color-ink-soft)]">
            Aún no has emparejado a nadie.
          </p>
        ) : (
          <ul className="space-y-2">
            {pairs.map((pair) => {
              const a = playerById.get(pair.playerAId);
              const b = playerById.get(pair.playerBId);
              return (
                <li
                  key={pair.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] px-3 py-2"
                >
                  <PairLine playerA={a ?? null} playerB={b ?? null} size="xs" />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleUnpair(pair.id)}
                    aria-label="Deshacer pareja"
                    className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-danger)]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Deshacer
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {err ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]"
        >
          {err}
        </p>
      ) : null}
    </div>
  );
}
