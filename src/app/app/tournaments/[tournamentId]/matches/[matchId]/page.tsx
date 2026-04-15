import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PairLine } from '@/components/ui/PairLine';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { ResultForm } from './ResultForm';
import { ValidateControls } from './ValidateControls';
import type { MatchPhase } from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';

const PHASE_LABEL: Record<MatchPhase, string> = {
  group: 'Fase de grupos',
  R32: 'Dieciseisavos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinal',
  F: 'Final',
};

const STATUS_TONE = {
  validated: 'ok',
  reported: 'warn',
  pending: 'neutral',
  disputed: 'danger',
  walkover: 'info',
  corrected: 'neutral',
} as const;

const STATUS_LABEL: Record<string, string> = {
  validated: 'Validado',
  reported: 'Reportado',
  pending: 'Pendiente',
  disputed: 'En disputa',
  walkover: 'W.O.',
  corrected: 'Corregido',
};

export default async function MatchPage({
  params,
}: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  const { tournamentId, matchId } = await params;
  const session = await requireSession();
  const repo = await getRepo();
  const [match, tournament] = await Promise.all([
    repo.getMatch(matchId),
    repo.getTournament(tournamentId),
  ]);
  if (!match || !tournament) notFound();

  const [pairA, pairB, existingResult, players] = await Promise.all([
    repo.getPair(match.pairAId),
    repo.getPair(match.pairBId),
    repo.getResultForMatch(match.id),
    repo.listPlayers(),
  ]);
  if (!pairA || !pairB) notFound();

  const playerById = new Map(players.map((p) => [p.id, p] as const));
  const playerIds = new Set([
    pairA.playerAId,
    pairA.playerBId,
    pairB.playerAId,
    pairB.playerBId,
  ]);
  const isPlayer = playerIds.has(session.player.id);
  const isOwner = tournament.ownerId === session.userId;

  const a1 = playerById.get(pairA.playerAId);
  const a2 = playerById.get(pairA.playerBId);
  const b1 = playerById.get(pairB.playerAId);
  const b2 = playerById.get(pairB.playerBId);

  const winnerPairId = existingResult?.winnerPairId ?? null;
  const aWon = winnerPairId === pairA.id;
  const bWon = winnerPairId === pairB.id;
  const status = existingResult?.status ?? 'pending';

  return (
    <div className="space-y-6">
      <Link
        href={`/app/tournaments/${tournamentId}`}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {tournament.name}
      </Link>

      <Card variant={status === 'validated' ? 'spotlight' : 'default'} className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardEyebrow>{PHASE_LABEL[match.phase]}</CardEyebrow>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight">
              Partido
            </h1>
          </div>
          <Badge tone={STATUS_TONE[status as keyof typeof STATUS_TONE] ?? 'neutral'}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] p-4">
          <PairSide playerA={a1} playerB={a2} won={aWon} align="left" />
          <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight text-[color:var(--color-ink-mute)]">
            vs
          </span>
          <PairSide playerA={b1} playerB={b2} won={bWon} align="right" />
        </div>

        {existingResult ? (
          <SetsBreakdown
            sets={existingResult.sets.map((s, i) => ({ i, a: s.a, b: s.b }))}
            aWon={aWon}
            bWon={bWon}
          />
        ) : null}

        {existingResult && isOwner && existingResult.status === 'reported' ? (
          <ValidateControls tournamentId={tournamentId} matchId={match.id} />
        ) : null}
      </Card>

      {existingResult ? null : isPlayer ? (
        <Card>
          <CardEyebrow>Reportar resultado</CardEyebrow>
          <p className="mt-1 mb-4 text-sm text-[color:var(--color-ink-soft)]">
            Introduce los sets jugados. El organizador valida después.
          </p>
          <ResultForm matchId={match.id} />
        </Card>
      ) : (
        <Card variant="flat" className="border border-dashed border-[color:var(--color-line)]">
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            Solo un jugador del partido puede reportar el resultado.
          </p>
        </Card>
      )}
    </div>
  );
}

type Player = Readonly<{ displayName: string; avatarUrl: string | null }>;

function PairSide({
  playerA,
  playerB,
  won,
  align,
}: {
  playerA: Player | undefined;
  playerB: Player | undefined;
  won: boolean;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        align === 'right' ? 'items-end text-right' : 'items-start',
      )}
    >
      <PairLine playerA={playerA} playerB={playerB} size="md" avatarsOnly />
      <span
        className={cn(
          'mt-1 max-w-full truncate font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight',
          won ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-ink)]',
        )}
      >
        {playerA?.displayName ?? '—'}
      </span>
      <span
        className={cn(
          'max-w-full truncate text-sm',
          won ? 'text-[color:var(--color-accent)]/90' : 'text-[color:var(--color-ink-soft)]',
        )}
      >
        {playerB?.displayName ?? '—'}
      </span>
    </div>
  );
}

function SetsBreakdown({
  sets,
  aWon,
  bWon,
}: {
  sets: ReadonlyArray<{ i: number; a: number; b: number }>;
  aWon: boolean;
  bWon: boolean;
}) {
  return (
    <div>
      <CardEyebrow>Resultado</CardEyebrow>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {sets.map((s) => {
          const aWonThisSet = s.a > s.b;
          return (
            <li
              key={s.i}
              className="rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] p-3 text-center"
            >
              <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-ink-mute)]">
                Set {s.i + 1}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
                <span className={aWonThisSet ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-ink)]'}>
                  {s.a}
                </span>
                <span className="mx-1 text-[color:var(--color-ink-mute)]">–</span>
                <span className={!aWonThisSet ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-ink)]'}>
                  {s.b}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-[color:var(--color-ink-soft)]">
        {aWon
          ? 'Pareja A gana el partido.'
          : bWon
          ? 'Pareja B gana el partido.'
          : 'Resultado pendiente de validación.'}
      </p>
    </div>
  );
}
