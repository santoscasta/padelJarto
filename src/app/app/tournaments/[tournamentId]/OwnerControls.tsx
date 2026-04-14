'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  openTournamentAction,
  startTournamentAction,
  advanceToKnockoutAction,
  createInvitationAction,
} from '@/app/app/tournaments/actions';

type Props = {
  tournamentId: string;
  status: 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
};

export function OwnerControls({ tournamentId, status }: Props) {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
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
