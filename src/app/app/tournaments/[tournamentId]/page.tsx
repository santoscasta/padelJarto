import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { PairLine } from '@/components/ui/PairLine';
import { EditablePairName } from '@/components/ui/EditablePairName';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { OwnerControls } from './OwnerControls';
import { GroupsView } from './GroupsView';
import { KnockoutView } from './KnockoutView';
import { RoundsView } from './RoundsView';
import { InviteLinkCard } from './InviteLinkCard';
import { OwnerPairsManager } from './OwnerPairsManager';
import { getServerEnv } from '@/lib/env';
import { computeTournamentRounds } from '@/lib/domain/rounds';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  groups: 'Grupos',
  knockout: 'Play-off',
  complete: 'Cerrado',
};
const STATUS_TONE = {
  draft: 'neutral',
  open: 'accent',
  groups: 'info',
  knockout: 'spark',
  complete: 'neutral',
} as const;

export default async function TournamentDetailPage({
  params,
}: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const session = await requireSession();
  const repo = await getRepo();
  const tournament = await repo.getTournament(tournamentId);
  if (!tournament) notFound();

  const [groups, matches, pairs, inscriptions, players] = await Promise.all([
    repo.listGroups(tournamentId),
    repo.listMatches(tournamentId),
    repo.listPairsForTournament(tournamentId),
    repo.listInscriptions(tournamentId),
    repo.listPlayers(),
  ]);
  const resultPromises = matches.map((m) => repo.getResultForMatch(m.id));
  const results = (await Promise.all(resultPromises)).filter(Boolean) as NonNullable<
    Awaited<(typeof resultPromises)[0]>
  >[];

  const isOwner = tournament.ownerId === session.userId;
  const status = tournament.status;
  const inscritosVisible = isPreStart(status);

  const myInscription = inscriptions.find((i) => i.playerId === session.player.id);
  const myPair = myInscription?.pairId
    ? pairs.find((p) => p.id === myInscription.pairId) ?? null
    : null;
  const partner = myPair
    ? players.find(
        (p) =>
          p.id ===
          (myPair.playerAId === session.player.id
            ? myPair.playerBId
            : myPair.playerAId),
      ) ?? null
    : null;
  const pairFallback = myPair
    ? `${session.displayName} / ${partner?.displayName ?? '—'}`
    : '';

  return (
    <div className="space-y-6">
      <Link
        href="/app/tournaments"
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Torneos
      </Link>

      <Card variant="spotlight" className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardEyebrow>Torneo</CardEyebrow>
            <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
              {tournament.name}
            </h1>
          </div>
          <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] ?? status}</Badge>
        </div>

        <dl className="grid grid-cols-3 gap-4 border-t border-[color:var(--color-line)]/60 pt-4">
          <MetaTile label="Parejas" value={String(tournament.size)} />
          <MetaTile
            label="Grupos"
            value={tournament.groupCount === 1 ? 'Único' : String(tournament.groupCount)}
          />
          <MetaTile
            label="Play-off"
            value={tournament.playoffCutoff === 0 ? '—' : `Top ${tournament.playoffCutoff}`}
          />
        </dl>
      </Card>

      {myPair ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardEyebrow>Tu pareja</CardEyebrow>
              <div className="mt-2">
                <EditablePairName
                  pairId={myPair.id}
                  displayName={myPair.displayName}
                  fallback={pairFallback}
                />
              </div>
              <div className="mt-3">
                <PairLine
                  playerA={
                    players.find((p) => p.id === myPair.playerAId) ?? null
                  }
                  playerB={
                    players.find((p) => p.id === myPair.playerBId) ?? null
                  }
                  size="xs"
                />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {isOwner ? (
        <Card>
          <CardEyebrow>Organizador</CardEyebrow>
          <p className="mt-1 mb-4 text-sm text-[color:var(--color-ink-soft)]">
            Controla el estado y el formato del torneo.
          </p>
          <OwnerControls
            tournamentId={tournament.id}
            status={tournament.status}
            pairingMode={tournament.pairingMode}
            hasInscriptions={inscriptions.length > 0}
          />
        </Card>
      ) : null}

      {inscritosVisible ? (
        <>
          <InviteLinkCard baseUrl={getServerEnv().NEXT_PUBLIC_APP_URL} />
          <Card>
            <header className="mb-4 flex items-center justify-between">
              <div>
                <CardEyebrow>Inscritos</CardEyebrow>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
                  {inscriptions.length}
                  <span className="ml-1 text-base text-[color:var(--color-ink-mute)]">
                    / {tournament.size}
                  </span>
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-surface-2)] text-[color:var(--color-accent)]">
                <Users className="h-5 w-5" aria-hidden />
              </span>
            </header>

            {inscriptions.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-line)] p-4 text-center text-sm text-[color:var(--color-ink-soft)]">
                Aún nadie. Comparte el link de invitación.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {inscriptions.map((i) => {
                  const pl = players.find((p) => p.id === i.playerId);
                  return (
                    <li
                      key={i.id}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] px-3 py-2"
                    >
                      <Avatar
                        src={pl?.avatarUrl ?? null}
                        name={pl?.displayName ?? '—'}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {pl?.displayName ?? i.playerId}
                      </span>
                      {i.pairId ? (
                        <Badge tone="ok">En pareja</Badge>
                      ) : (
                        <Badge tone="neutral">Solo</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {isOwner && status === 'open' && tournament.pairingMode === 'owner_picks' ? (
            <Card>
              <CardEyebrow>Asignación de parejas</CardEyebrow>
              <p className="mt-1 mb-4 text-sm text-[color:var(--color-ink-soft)]">
                Empareja jugadores antes de cerrar inscripciones.
              </p>
              <OwnerPairsManager
                tournamentId={tournament.id}
                inscriptions={inscriptions.map((i) => ({
                  playerId: i.playerId,
                  pairId: i.pairId,
                }))}
                players={players.map((p) => ({
                  id: p.id,
                  displayName: p.displayName,
                  avatarUrl: p.avatarUrl,
                }))}
                pairs={pairs.map((p) => ({
                  id: p.id,
                  playerAId: p.playerAId,
                  playerBId: p.playerBId,
                  displayName: p.displayName,
                }))}
              />
            </Card>
          ) : null}
        </>
      ) : null}

      {status === 'groups' || status === 'knockout' || status === 'complete' ? (
        <>
          <RoundsView
            tournamentId={tournament.id}
            rounds={computeTournamentRounds(
              groups,
              matches.filter((m) => m.phase === 'group'),
            )}
            pairs={pairs}
            players={players}
            results={results}
            currentPairId={myPair?.id ?? null}
          />
          <GroupsView
            tournamentId={tournament.id}
            groups={groups}
            pairs={pairs}
            players={players}
            matches={matches.filter((m) => m.phase === 'group')}
            results={results}
          />
          {status === 'knockout' || status === 'complete' ? (
            <KnockoutView
              tournamentId={tournament.id}
              matches={matches.filter((m) => m.phase !== 'group')}
              pairs={pairs}
              players={players}
              results={results}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-ink-mute)]">
        {label}
      </dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
        {value}
      </dd>
    </div>
  );
}

function isPreStart(status: string): boolean {
  return status === 'draft' || status === 'open';
}
