'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, DoorOpen, Flag, Forward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import {
  openTournamentAction,
  startTournamentAction,
  advanceToKnockoutAction,
  createInvitationAction,
  changePairingModeAction,
} from '@/app/app/tournaments/actions';

type PairingMode = 'pre_inscribed' | 'draw' | 'mixed' | 'owner_picks';

type Props = Readonly<{
  tournamentId: string;
  status: 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
  pairingMode: PairingMode;
  hasInscriptions: boolean;
}>;

const PAIRING_LABELS: Record<PairingMode, string> = {
  pre_inscribed: 'Con pareja pre-inscrita',
  draw: 'Sorteo de parejas al empezar',
  mixed: 'Mixto (solo o con pareja)',
  owner_picks: 'El organizador asigna parejas',
};

export function OwnerControls({
  tournamentId,
  status,
  pairingMode,
  hasInscriptions,
}: Props) {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const router = useRouter();
  const canChangeMode =
    (status === 'draft' || status === 'open') && !hasInscriptions;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setErr(null);
    setLinkCopied(false);
    start(async () => {
      const res = await fn();
      if (!res.ok && 'message' in res) setErr(res.message ?? 'Error');
      router.refresh();
    });
  }

  async function copyInvitation() {
    setErr(null);
    setLinkCopied(false);
    start(async () => {
      const r = await createInvitationAction(tournamentId);
      if (!r.ok) {
        setErr(r.message);
        return;
      }
      try {
        await navigator.clipboard?.writeText(
          `${location.origin}/invite/${r.data.token}`,
        );
        setLinkCopied(true);
      } catch {
        // Clipboard may be denied in iframes; the action still succeeded.
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canChangeMode ? (
        <Field label="Modo de parejas">
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
              <option key={m} value={m}>
                {PAIRING_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status === 'draft' ? (
          <>
            <Button
              disabled={isPending}
              onClick={() => run(() => openTournamentAction(tournamentId))}
            >
              <DoorOpen className="h-4 w-4" aria-hidden /> Abrir inscripciones
            </Button>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={copyInvitation}
            >
              <Copy className="h-4 w-4" aria-hidden />
              {linkCopied ? '¡Copiado!' : 'Copiar link'}
            </Button>
          </>
        ) : null}

        {status === 'open' ? (
          <>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={copyInvitation}
            >
              <Copy className="h-4 w-4" aria-hidden />
              {linkCopied ? '¡Copiado!' : 'Copiar link'}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => run(() => startTournamentAction(tournamentId))}
            >
              <Flag className="h-4 w-4" aria-hidden /> Cerrar y sortear
            </Button>
          </>
        ) : null}

        {status === 'groups' ? (
          <Button
            disabled={isPending}
            onClick={() => run(() => advanceToKnockoutAction(tournamentId))}
          >
            <Forward className="h-4 w-4" aria-hidden /> Pasar a eliminatorias
          </Button>
        ) : null}
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
