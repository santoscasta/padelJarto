import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { InviteForm } from './InviteForm';

// Wrapping the impure time read in a helper keeps `InvitePage` body free of
// direct `Date.now()` calls, which the `react-hooks/purity` rule flags even in
// async server components (where render replays do not apply).
function isExpired(expiresAtIso: string): boolean {
  return new Date(expiresAtIso).getTime() < new Date().getTime();
}

export default async function InvitePage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepo();
  const inv = await repo.getInvitationByToken(token);
  if (!inv) notFound();
  // Use the public getter so anonymous visitors (not yet logged in) can see
  // the tournament name and login CTA. RLS on `tournaments` only allows
  // authenticated selects, which would otherwise trip a 404 here.
  const tournament = await repo.getTournamentPublic(inv.tournamentId);
  if (!tournament) notFound();

  const expired = isExpired(inv.expiresAt);
  const session = await getSession();

  return (
    <main className="mx-auto max-w-xl px-4 py-10 space-y-6">
      <CardHeader>
        <CardTitle>Invitación a {tournament.name}</CardTitle>
      </CardHeader>
      {expired ? (
        <Card>
          <p className="text-sm">Esta invitación ha caducado. Pide una nueva al organizador.</p>
        </Card>
      ) : !session ? (
        <Card>
          <p className="mb-4 text-sm">Inicia sesión para unirte al torneo.</p>
          <Button asChild>
            <Link href={`/login?next=/invite/${token}`}>Entrar</Link>
          </Button>
        </Card>
      ) : tournament.status !== 'open' ? (
        <Card>
          <p className="text-sm">Las inscripciones aún no están abiertas (estado: {tournament.status}).</p>
        </Card>
      ) : (
        <Card>
          <InviteForm
            token={token}
            pairingMode={tournament.pairingMode}
            players={(await repo.listPlayers()).filter((p) => p.id !== session.player.id).map((p) => ({ id: p.id, displayName: p.displayName }))}
          />
        </Card>
      )}
    </main>
  );
}
