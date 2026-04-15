'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import {
  openTournamentAction,
  startTournamentAction,
  advanceToKnockoutAction,
  createInvitationAction,
  changePairingModeAction,
} from '@/app/app/tournaments/actions';

type PairingMode = 'pre_inscribed' | 'draw' | 'mixed';

type Props = {
  tournamentId: string;
  status: 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
  pairingMode: PairingMode;
  hasInscriptions: boolean;
};

const PAIRING_LABELS: Record<PairingMode, string> = {
  pre_inscribed: 'Con pareja pre-inscrita',
  draw: 'Sorteo de parejas al empezar',
  mixed: 'Mixto (solo o con pareja)',
};

export function OwnerControls({ tournamentId, status, pairingMode, hasInscriptions }: Props) {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const canChangeMode = (status === 'draft' || status === 'open') && !hasInscriptions;
  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok && 'message' in res) setErr(res.message ?? 'Error');
      router.refresh();
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {canChangeMode && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[color:var(--color-ink-soft)]">Parejas:</span>
          <Select
            value={pairingMode}
            disabled={isPending}
            onChange={(e) =>
              run(() =>
                changePairingModeAction({
                  tournamentId,
                  pairingMode: e.target.value as PairingMode,
                }),
              )
            }
          >
            {(Object.keys(PAIRING_LABELS) as PairingMode[]).map((m) => (
              <option key={m} value={m}>{PAIRING_LABELS[m]}</option>
            ))}
          </Select>
        </label>
      )}
      {status === 'draft' && (
        <>
          <Button disabled={isPending} onClick={() => run(() => openTournamentAction(tournamentId))}>
            Abrir inscripciones
          </Button>
          <Button variant="secondary" disabled={isPending}
            onClick={() => run(async () => {
              const r = await createInvitationAction(tournamentId);
              if (r.ok) await navigator.clipboard?.writeText(`${location.origin}/invite/${r.data.token}`);
              return r;
            })}>
            Copiar link de invitación
          </Button>
        </>
      )}
      {status === 'open' && (
        <>
          <Button variant="secondary" disabled={isPending}
            onClick={() => run(async () => {
              const r = await createInvitationAction(tournamentId);
              if (r.ok) await navigator.clipboard?.writeText(`${location.origin}/invite/${r.data.token}`);
              return r;
            })}>
            Copiar link
          </Button>
          <Button disabled={isPending} onClick={() => run(() => startTournamentAction(tournamentId))}>
            Cerrar inscripciones y sortear
          </Button>
        </>
      )}
      {status === 'groups' && (
        <Button disabled={isPending} onClick={() => run(() => advanceToKnockoutAction(tournamentId))}>
          Pasar a eliminatorias
        </Button>
      )}
      {err ? <p className="w-full text-sm text-[color:var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
