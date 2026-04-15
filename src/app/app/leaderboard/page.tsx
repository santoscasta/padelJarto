import Link from 'next/link';
import { Trophy, Crown } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { getRepo } from '@/lib/repositories/provider';
import { cn } from '@/lib/utils/cn';

export default async function LeaderboardPage({
  searchParams,
}: { searchParams: Promise<{ tab?: 'players' | 'pairs' }> }) {
  const sp = await searchParams;
  const tab: 'players' | 'pairs' = sp.tab === 'pairs' ? 'pairs' : 'players';
  const repo = await getRepo();
  const [players, pairs] = await Promise.all([
    repo.listPlayers(),
    repo.listPairsRanked(50),
  ]);
  const playersById = new Map(players.map((p) => [p.id, p] as const));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <CardEyebrow>Ranking</CardEyebrow>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
            Clasificación
          </h1>
        </div>
        <Trophy className="h-7 w-7 text-[color:var(--color-spark)]" aria-hidden />
      </header>

      <SegmentedTabs current={tab} />

      {tab === 'players' ? (
        <PlayersBoard players={players} />
      ) : (
        <PairsBoard pairs={pairs} playersById={playersById} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- segmented */

function SegmentedTabs({ current }: { current: 'players' | 'pairs' }) {
  const tabs = [
    { value: 'players' as const, label: 'Jugadores' },
    { value: 'pairs' as const, label: 'Parejas' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Tipo de ranking"
      className="inline-flex rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1"
    >
      {tabs.map(({ value, label }) => {
        const active = current === value;
        return (
          <Link
            key={value}
            href={`/app/leaderboard?tab=${value}`}
            role="tab"
            aria-selected={active}
            className={cn(
              'cursor-pointer rounded-full px-5 py-2 text-sm font-semibold tracking-tight transition-colors duration-[var(--duration-fast)]',
              active
                ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] shadow-[var(--shadow-glow)]'
                : 'text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]',
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- players */

type PlayerRow = Awaited<ReturnType<Awaited<ReturnType<typeof getRepo>>['listPlayers']>>[number];

function PlayersBoard({ players }: { players: ReadonlyArray<PlayerRow> }) {
  if (players.length === 0) {
    return (
      <Card variant="flat" className="border border-dashed border-[color:var(--color-line)]">
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Aún no hay jugadores con partidos jugados.
        </p>
      </Card>
    );
  }

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="space-y-6">
      <Podium podium={podium} />
      {rest.length > 0 ? (
        <Card variant="flat" className="p-2">
          <ol className="divide-y divide-[color:var(--color-line)]/60">
            {rest.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/app/players/${p.id}`}
                  className="group flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-surface-2)]"
                >
                  <span className="font-[family-name:var(--font-display)] w-8 text-center text-base font-bold tabular-nums text-[color:var(--color-ink-mute)] group-hover:text-[color:var(--color-ink)]">
                    {i + 4}
                  </span>
                  <Avatar src={p.avatarUrl} name={p.displayName} size="sm" />
                  <span className="flex-1 text-sm font-medium">{p.displayName}</span>
                  <span className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[color:var(--color-accent)]">
                    {Math.round(p.rating)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}

function Podium({ podium }: { podium: ReadonlyArray<PlayerRow> }) {
  const [first, second, third] = [podium[0], podium[1], podium[2]];
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
      <PodiumPlace player={second} place={2} heightClass="h-28" />
      <PodiumPlace player={first} place={1} heightClass="h-36" highlighted />
      <PodiumPlace player={third} place={3} heightClass="h-24" />
    </div>
  );
}

function PodiumPlace({
  player,
  place,
  heightClass,
  highlighted = false,
}: {
  player: PlayerRow | undefined;
  place: 1 | 2 | 3;
  heightClass: string;
  highlighted?: boolean;
}) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-[color:var(--color-line)] text-[color:var(--color-ink-mute)]">
          —
        </span>
        <div className={cn('w-full rounded-t-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]', heightClass)} />
      </div>
    );
  }
  const accent =
    place === 1
      ? 'text-[color:var(--color-spark)]'
      : place === 2
      ? 'text-[color:var(--color-info)]'
      : 'text-[color:var(--color-warn)]';
  return (
    <Link
      href={`/app/players/${player.id}`}
      className="group flex cursor-pointer flex-col items-center gap-3 outline-none"
    >
      <div className="relative">
        <Avatar
          src={player.avatarUrl}
          name={player.displayName}
          size={highlighted ? 'lg' : 'md'}
          className={highlighted ? 'ring-2 ring-[color:var(--color-spark)] ring-offset-4 ring-offset-[color:var(--color-bg)]' : ''}
        />
        {highlighted ? (
          <Crown
            aria-hidden
            className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 text-[color:var(--color-spark)]"
          />
        ) : null}
      </div>
      <span className="max-w-full truncate text-center text-xs font-medium">{player.displayName}</span>
      <div
        className={cn(
          'flex w-full flex-col items-center justify-end gap-1 rounded-t-[var(--radius-md)] border border-b-0 border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-3 transition-colors group-hover:bg-[color:var(--color-surface-2)]',
          heightClass,
        )}
      >
        <span className={cn('font-[family-name:var(--font-display)] text-xl font-bold leading-none', accent)}>
          {place}º
        </span>
        <span className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[color:var(--color-ink)]">
          {Math.round(player.rating)}
        </span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------- pairs */

type PairRow = Awaited<ReturnType<Awaited<ReturnType<typeof getRepo>>['listPairsRanked']>>[number];

function PairsBoard({
  pairs,
  playersById,
}: {
  pairs: ReadonlyArray<PairRow>;
  playersById: ReadonlyMap<string, PlayerRow>;
}) {
  if (pairs.length === 0) {
    return (
      <Card variant="flat" className="border border-dashed border-[color:var(--color-line)]">
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Aún no hay parejas formadas.
        </p>
      </Card>
    );
  }
  return (
    <Card variant="flat" className="p-2">
      <ol className="divide-y divide-[color:var(--color-line)]/60">
        {pairs.map((pair, i) => {
          const pa = playersById.get(pair.playerAId);
          const pb = playersById.get(pair.playerBId);
          return (
            <li
              key={pair.id}
              className="flex items-center gap-3 px-3 py-3"
            >
              <span className="font-[family-name:var(--font-display)] w-8 text-center text-base font-bold tabular-nums text-[color:var(--color-ink-mute)]">
                {i + 1}
              </span>
              <span className="flex -space-x-2">
                <Avatar
                  src={pa?.avatarUrl ?? null}
                  name={pa?.displayName ?? ''}
                  size="sm"
                  className="ring-2 ring-[color:var(--color-surface)]"
                />
                <Avatar
                  src={pb?.avatarUrl ?? null}
                  name={pb?.displayName ?? ''}
                  size="sm"
                  className="ring-2 ring-[color:var(--color-surface)]"
                />
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {pa?.displayName ?? '—'} <span className="text-[color:var(--color-ink-mute)]">/</span> {pb?.displayName ?? '—'}
              </span>
              <span className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[color:var(--color-accent)]">
                {Math.round(pair.rating)}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
