import Link from 'next/link';
import { ArrowRight, Coffee } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PairLine } from '@/components/ui/PairLine';
import type { Pair, Player, Result } from '@/lib/domain/types';
import type { TournamentRound, GroupRound, ScheduledMatch } from '@/lib/domain/rounds';
import { cn } from '@/lib/utils/cn';

const STATUS_TONE = {
  validated: 'ok',
  reported: 'warn',
  pending: 'neutral',
} as const;
const STATUS_LABEL: Record<string, string> = {
  validated: 'Validado',
  reported: 'Reportado',
  pending: 'Pendiente',
};

type Props = Readonly<{
  tournamentId: string;
  rounds: ReadonlyArray<TournamentRound>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  results: ReadonlyArray<Result>;
  /** Pair id of the viewing user, if any. Highlights their matches. */
  currentPairId: string | null;
}>;

export function RoundsView({
  tournamentId,
  rounds,
  pairs,
  players,
  results,
  currentPairId,
}: Props) {
  if (rounds.length === 0) return null;

  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));

  function pairPlayers(pairId: string) {
    const p = pairById.get(pairId);
    if (!p) return { a: undefined, b: undefined };
    return {
      a: playerById.get(p.playerAId),
      b: playerById.get(p.playerBId),
    };
  }

  function statusFor(matchId: string): 'validated' | 'reported' | 'pending' {
    const r = results.find(
      (res) => res.matchId === matchId && res.status !== 'corrected',
    );
    if (!r) return 'pending';
    if (r.status === 'validated') return 'validated';
    return 'reported';
  }

  // Progress: a round is "done" when every match has a validated result.
  function isRoundDone(round: TournamentRound): boolean {
    const all = round.groupRounds.flatMap((gr) => gr.matches);
    return all.length > 0 && all.every((m) => statusFor(m.match.id) === 'validated');
  }
  const currentRoundIndex = rounds.findIndex((r) => !isRoundDone(r));
  const activeRoundNumber =
    currentRoundIndex === -1 ? null : rounds[currentRoundIndex].number;

  return (
    <section aria-labelledby="rounds-heading" className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <CardEyebrow>Calendario</CardEyebrow>
          <h2
            id="rounds-heading"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight"
          >
            Jornadas
          </h2>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            Cada jornada junta los partidos que se pueden jugar a la vez sin
            que nadie coincida.
          </p>
        </div>
      </header>

      <ol className="space-y-4">
        {rounds.map((round) => {
          const isActive = round.number === activeRoundNumber;
          const done = isRoundDone(round);
          return (
            <li key={round.number}>
              <Card
                variant={isActive ? 'spotlight' : 'default'}
                className="space-y-4"
              >
                <header className="flex items-center justify-between gap-3">
                  <div>
                    <CardEyebrow>Jornada {round.number}</CardEyebrow>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight">
                      {done
                        ? 'Terminada'
                        : isActive
                          ? 'En curso'
                          : `Jornada ${round.number}`}
                    </p>
                  </div>
                  <Badge tone={done ? 'ok' : isActive ? 'spark' : 'neutral'}>
                    {countRoundMatches(round)}{' '}
                    {countRoundMatches(round) === 1 ? 'partido' : 'partidos'}
                  </Badge>
                </header>

                <div className="space-y-3">
                  {round.groupRounds.map((gr) => (
                    <GroupRoundBlock
                      key={gr.groupId}
                      tournamentId={tournamentId}
                      groupRound={gr}
                      pairPlayers={pairPlayers}
                      statusFor={statusFor}
                      pairById={pairById}
                      currentPairId={currentPairId}
                      showGroupLabel={round.groupRounds.length > 1}
                    />
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function countRoundMatches(round: TournamentRound): number {
  return round.groupRounds.reduce((n, gr) => n + gr.matches.length, 0);
}

function GroupRoundBlock({
  tournamentId,
  groupRound,
  pairPlayers,
  statusFor,
  pairById,
  currentPairId,
  showGroupLabel,
}: {
  tournamentId: string;
  groupRound: GroupRound;
  pairPlayers: (pairId: string) => {
    a: Readonly<{ displayName: string; avatarUrl: string | null }> | undefined;
    b: Readonly<{ displayName: string; avatarUrl: string | null }> | undefined;
  };
  statusFor: (matchId: string) => 'validated' | 'reported' | 'pending';
  pairById: Map<string, Pair>;
  currentPairId: string | null;
  showGroupLabel: boolean;
}) {
  const byePair = groupRound.byePairId ? pairById.get(groupRound.byePairId) : null;
  return (
    <div className="space-y-2">
      {showGroupLabel ? (
        <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-ink-mute)]">
          Grupo {groupRound.groupLabel}
        </p>
      ) : null}

      <ul className="space-y-2">
        {groupRound.matches.map((sm) => (
          <li key={sm.match.id}>
            <MatchRow
              tournamentId={tournamentId}
              scheduled={sm}
              pairPlayers={pairPlayers}
              statusFor={statusFor}
              pairById={pairById}
              currentPairId={currentPairId}
            />
          </li>
        ))}
      </ul>

      {byePair ? (
        <ByeRow
          playerA={pairPlayers(byePair.id).a ?? null}
          playerB={pairPlayers(byePair.id).b ?? null}
          pairDisplayName={byePair.displayName}
        />
      ) : null}
    </div>
  );
}

function MatchRow({
  tournamentId,
  scheduled,
  pairPlayers,
  statusFor,
  pairById,
  currentPairId,
}: {
  tournamentId: string;
  scheduled: ScheduledMatch;
  pairPlayers: (pairId: string) => {
    a: Readonly<{ displayName: string; avatarUrl: string | null }> | undefined;
    b: Readonly<{ displayName: string; avatarUrl: string | null }> | undefined;
  };
  statusFor: (matchId: string) => 'validated' | 'reported' | 'pending';
  pairById: Map<string, Pair>;
  currentPairId: string | null;
}) {
  const { pairAId, pairBId, match } = scheduled;
  const a = pairPlayers(pairAId);
  const b = pairPlayers(pairBId);
  const aName = pairById.get(pairAId)?.displayName ?? null;
  const bName = pairById.get(pairBId)?.displayName ?? null;
  const status = statusFor(match.id);
  const isMine =
    currentPairId !== null &&
    (pairAId === currentPairId || pairBId === currentPairId);

  return (
    <Link
      href={`/app/tournaments/${tournamentId}/matches/${match.id}`}
      className={cn(
        'group flex cursor-pointer flex-col gap-2 rounded-[var(--radius-md)] border bg-[color:var(--color-surface)] px-3 py-2.5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40 sm:flex-row sm:items-center sm:justify-between',
        isMine
          ? 'border-[color:var(--color-accent)]/50 ring-1 ring-[color:var(--color-accent)]/30'
          : 'border-[color:var(--color-line)]',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PairLine
          playerA={a.a ?? null}
          playerB={a.b ?? null}
          size="xs"
          displayName={aName}
        />
        <span className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-widest text-[color:var(--color-ink-mute)]">
          vs
        </span>
        <PairLine
          playerA={b.a ?? null}
          playerB={b.b ?? null}
          size="xs"
          displayName={bName}
        />
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {isMine ? <Badge tone="accent">Tú</Badge> : null}
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] ?? status}</Badge>
        <ArrowRight
          className="h-4 w-4 text-[color:var(--color-ink-mute)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[color:var(--color-accent)]"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function ByeRow({
  playerA,
  playerB,
  pairDisplayName,
}: {
  playerA: Readonly<{ displayName: string; avatarUrl: string | null }> | null;
  playerB: Readonly<{ displayName: string; avatarUrl: string | null }> | null;
  pairDisplayName: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-2)]/50 px-3 py-2 text-sm text-[color:var(--color-ink-soft)]">
      <Coffee className="h-4 w-4 text-[color:var(--color-ink-mute)]" aria-hidden />
      <span className="flex-1">
        <span className="font-[family-name:var(--font-display)] text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-ink-mute)]">
          Descansa
        </span>
        <span className="ml-2">
          <PairLine
            playerA={playerA}
            playerB={playerB}
            size="xs"
            displayName={pairDisplayName}
          />
        </span>
      </span>
    </div>
  );
}
