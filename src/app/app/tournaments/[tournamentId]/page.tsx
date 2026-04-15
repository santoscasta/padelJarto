import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { OwnerControls } from './OwnerControls';
import { GroupsView } from './GroupsView';
import { KnockoutView } from './KnockoutView';
import { InviteLinkCard } from './InviteLinkCard';
import { OwnerPairsManager } from './OwnerPairsManager';
import { getServerEnv } from '@/lib/env';

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
  const results = (await Promise.all(resultPromises)).filter(Boolean) as NonNullable<Awaited<typeof resultPromises[0]>>[];

  const isOwner = tournament.ownerId === session.userId;

  return (
    <section className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>{tournament.name}</CardTitle>
          <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
            {tournament.size} parejas · {tournament.groupCount === 1 ? 'grupo único' : `${tournament.groupCount} grupos`} · top {tournament.playoffCutoff}
          </p>
        </div>
        <Badge tone="accent">{tournament.status}</Badge>
      </CardHeader>

      {isOwner ? (
        <Card>
          <p className="mb-3 text-sm font-semibold">Controles de organizador</p>
          <OwnerControls
            tournamentId={tournament.id}
            status={tournament.status}
            pairingMode={tournament.pairingMode}
            hasInscriptions={inscriptions.length > 0}
          />
        </Card>
      ) : null}

      {tournament.status === 'draft' || tournament.status === 'open' ? (
        <>
          <InviteLinkCard baseUrl={getServerEnv().NEXT_PUBLIC_APP_URL} />
          <Card>
            <p className="mb-2 text-sm font-semibold">Inscritos ({inscriptions.length}/{tournament.size})</p>
            <ul className="text-sm">
              {inscriptions.map((i) => {
                const pl = players.find((p) => p.id === i.playerId);
                return <li key={i.id}>{pl?.displayName ?? i.playerId}</li>;
              })}
            </ul>
          </Card>
          {isOwner && tournament.status === 'open' && tournament.pairingMode === 'owner_picks' ? (
            <Card>
              <p className="mb-3 text-sm font-semibold">Asignación de parejas</p>
              <OwnerPairsManager
                tournamentId={tournament.id}
                inscriptions={inscriptions.map((i) => ({ playerId: i.playerId, pairId: i.pairId }))}
                players={players.map((p) => ({ id: p.id, displayName: p.displayName }))}
                pairs={pairs.map((p) => ({ id: p.id, playerAId: p.playerAId, playerBId: p.playerBId }))}
              />
            </Card>
          ) : null}
        </>
      ) : null}

      {tournament.status === 'groups' || tournament.status === 'knockout' || tournament.status === 'complete' ? (
        <>
          <GroupsView
            tournamentId={tournament.id}
            groups={groups}
            pairs={pairs}
            players={players}
            matches={matches.filter((m) => m.phase === 'group')}
            results={results}
          />
          {tournament.status === 'knockout' || tournament.status === 'complete' ? (
            <KnockoutView
              tournamentId={tournament.id}
              matches={matches.filter((m) => m.phase !== 'group')}
              pairs={pairs} players={players} results={results}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
