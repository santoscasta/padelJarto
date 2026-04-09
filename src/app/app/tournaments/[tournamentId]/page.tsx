import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, Flag, Link2, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { KnockoutBracket } from "@/components/tournament/knockout-bracket";
import { StandingsTable } from "@/components/tournament/standings-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  configureIndividualKnockoutAction,
  createInvitationAction,
  createWhatsAppInvitationAction,
  createTeamAction,
  generateGroupStageAction,
  generateKnockoutAction,
  reviewSubmissionAction,
  submitScoreAction,
  updateIndividualPairingAction,
  updateMatchAction,
} from "@/app/app/actions";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  buildProfileMap,
  labelForSide,
  qualifiedPlayers,
  userCanReportMatch,
} from "@/lib/domain/selectors";
import { getAppUrl } from "@/lib/env";
import { getTournamentRepository } from "@/lib/repositories";
import { formatDateLabel, formatDateTimeLabel, toDateTimeLocalInput } from "@/lib/utils";

function summarizeSubmission(sets: Array<{ home: number; away: number }>) {
  return sets.map((set) => `${set.home}-${set.away}`).join(" · ");
}

function buildInvitationUrl(token: string) {
  return `${getAppUrl()}/invite/${token}`;
}

function buildWhatsAppShareUrl(
  tournament: {
    name: string;
    startsAt: string;
    location?: string | null;
  },
  token: string,
) {
  const inviteUrl = buildInvitationUrl(token);
  const parts = [
    `Te invito a unirte al torneo "${tournament.name}" en PadelJarto.`,
    `Fecha: ${formatDateLabel(tournament.startsAt)}${tournament.location ? ` · ${tournament.location}` : ""}.`,
    "Si es tu primera vez, entra con tu cuenta o crea acceso al abrir el enlace.",
    `Invitacion: ${inviteUrl}`,
  ];

  return `https://wa.me/?text=${encodeURIComponent(parts.join("\n"))}`;
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { tournamentId } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await requireCurrentUser();
  const detail = await getTournamentRepository().getTournamentDetail(tournamentId, currentUser.id);

  if (!detail) {
    notFound();
  }

  const isOrganizer = detail.membership.role === "organizer";
  const playerOptions = detail.members.filter((member) => member.id !== detail.tournament.organizerId);
  const profileMap = buildProfileMap(detail.members);
  const availableTeamPlayers = playerOptions.filter(
    (player) => !detail.teamMembers.some((teamMember) => teamMember.userId === player.id),
  );
  const qualifiers = qualifiedPlayers(detail);
  const canCreateIndividualKnockout =
    detail.tournament.mode === "individual_ranking" &&
    qualifiers.length >= detail.tournament.config.knockoutSize * 2 &&
    !detail.knockoutRounds.length;
  const pendingInvitations = detail.invitations.filter((invitation) => invitation.status === "pending");
  const shareInvitation =
    pendingInvitations.find((invitation) => invitation.token === resolvedSearchParams.share) ?? null;

  return (
    <div className="space-y-6">
      <Card className="surface-grid overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
                {detail.tournament.name}
              </h1>
              <Badge>{detail.membership.role === "organizer" ? "Organizer" : "Player"}</Badge>
              <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                {detail.tournament.mode === "fixed_pairs" ? "Parejas fijas" : "Ranking individual"}
              </Badge>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#d6d3d1]">
              {formatDateLabel(detail.tournament.startsAt)} a {formatDateLabel(detail.tournament.endsAt)} ·{" "}
              {detail.tournament.location}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Jugadores</p>
              <p className="mt-2 text-3xl font-semibold">{playerOptions.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Pendientes</p>
              <p className="mt-2 text-3xl font-semibold">{detail.pendingSubmissions.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Estado</p>
              <p className="mt-2 text-3xl font-semibold capitalize">{detail.tournament.status}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Participación</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-[#fb923c]" />
                  <p className="text-sm font-semibold">Miembros aceptados</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-[#d6d3d1]">
                  {playerOptions.slice(0, 8).map((member) => (
                    <li key={member.id}>{member.fullName}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-[#fb923c]" />
                  <p className="text-sm font-semibold">Invitaciones pendientes</p>
                </div>
                {pendingInvitations.length ? (
                  <div className="mt-4 space-y-3">
                    {pendingInvitations.map((invitation) => {
                      const invitationUrl = buildInvitationUrl(invitation.token);
                      const whatsAppShareUrl = buildWhatsAppShareUrl(detail.tournament, invitation.token);

                      return (
                        <article
                          key={invitation.id}
                          className="rounded-[20px] border border-white/10 bg-white/5 p-3"
                        >
                          <p className="font-medium text-[#fff7ed]">
                            {invitation.invitedEmail || "Invitacion por enlace compartible"}
                          </p>
                          <p className="mt-1 break-all text-xs text-[#a8a29e]">{invitationUrl}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {!invitation.invitedEmail ? (
                              <Button asChild className="h-9 px-4" variant="secondary">
                                <a href={whatsAppShareUrl} rel="noreferrer" target="_blank">
                                  <MessageCircle className="mr-2 size-4" />
                                  Compartir por WhatsApp
                                </a>
                              </Button>
                            ) : null}
                            <Button asChild className="h-9 px-4" variant="ghost">
                              <a href={invitationUrl} rel="noreferrer" target="_blank">
                                <Link2 className="mr-2 size-4" />
                                Abrir enlace
                              </a>
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#d6d3d1]">
                    Aun no has generado invitaciones para este torneo.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {isOrganizer ? (
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Controles del organizer</p>
              <div className="mt-5 space-y-6">
                {shareInvitation ? (
                  <div className="rounded-[24px] border border-[#f97316]/30 bg-[#f97316]/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Invitacion lista para compartir</p>
                    <p className="mt-3 text-sm leading-7 text-[#ffe7d0]">
                      El enlace ya esta creado. Si es la primera vez de tu amigo, entrara con su cuenta y luego aceptara la plaza desde este link.
                    </p>
                    <p className="mt-3 break-all rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-xs text-[#d6d3d1]">
                      {buildInvitationUrl(shareInvitation.token)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild>
                        <a
                          href={buildWhatsAppShareUrl(detail.tournament, shareInvitation.token)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <MessageCircle className="mr-2 size-4" />
                          Abrir WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="ghost">
                        <a href={buildInvitationUrl(shareInvitation.token)} rel="noreferrer" target="_blank">
                          <Link2 className="mr-2 size-4" />
                          Ver enlace
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  <form action={createInvitationAction} className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4">
                    <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                    <label className="field-label" htmlFor="invitedEmail">
                      Invitar jugador
                    </label>
                    <p className="text-sm leading-7 text-[#d6d3d1]">
                      Si ya sabes su email, enviale una invitacion directa para que entre con esa cuenta.
                    </p>
                    <input className="field-input" id="invitedEmail" name="invitedEmail" placeholder="amigo@correo.com" />
                    <Button className="w-fit" type="submit" variant="secondary">
                      Enviar invitacion por email
                    </Button>
                  </form>

                  <form action={createWhatsAppInvitationAction} className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4">
                    <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                    <p className="field-label">Invitar jugador</p>
                    <p className="text-sm leading-7 text-[#d6d3d1]">
                      Si prefieres compartirlo por WhatsApp o todavia no tiene cuenta, prepara un enlace y mandaselo directamente.
                    </p>
                    <Button className="w-fit" type="submit">
                      <MessageCircle className="mr-2 size-4" />
                      Compartir por WhatsApp
                    </Button>
                  </form>
                </div>

                {detail.tournament.mode === "fixed_pairs" ? (
                  <form action={createTeamAction} className="grid gap-3">
                    <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                    <label className="field-label" htmlFor="teamName">
                      Crear pareja fija
                    </label>
                    <input className="field-input" id="teamName" name="name" placeholder="Los Smash Bros" required />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select className="field-select" name="player1Id" required>
                        <option value="">Jugador 1</option>
                        {availableTeamPlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.fullName}
                          </option>
                        ))}
                      </select>
                      <select className="field-select" name="player2Id" required>
                        <option value="">Jugador 2</option>
                        {availableTeamPlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" variant="secondary">
                      Guardar pareja
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-4 text-sm text-[#d6d3d1]">
                    En ranking individual la app propone parejas por partido dentro de grupos y tú puedes ajustarlas debajo.
                  </div>
                )}

                {!detail.groups.length ? (
                  <form action={generateGroupStageAction}>
                    <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                    <Button type="submit">Generar fase de grupos</Button>
                  </form>
                ) : null}
              </div>
            </Card>
          ) : null}

          {detail.tournament.mode === "fixed_pairs" && detail.teams.length ? (
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Parejas inscritas</p>
              <div className="mt-4 grid gap-3">
                {detail.teams.map((team) => {
                  const roster = detail.teamMembers
                    .filter((teamMember) => teamMember.teamId === team.id)
                    .map((teamMember) => profileMap.get(teamMember.userId)?.fullName ?? "Jugador");
                  return (
                    <article key={team.id} className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-sm text-[#d6d3d1]">{roster.join(" / ")}</p>
                        </div>
                        <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">Seed {team.seed}</Badge>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Reglas activas</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Formato</p>
              <p className="mt-3 text-xl font-semibold">Grupos + eliminatoria</p>
              <p className="mt-2 text-sm text-[#d6d3d1]">
                {detail.tournament.config.groupCount} grupos, {detail.tournament.config.qualifiersPerGroup} clasificados por grupo.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Marcador</p>
              <p className="mt-3 text-xl font-semibold">
                Mejor de {detail.tournament.config.rules.bestOfSets} sets
              </p>
              <p className="mt-2 text-sm text-[#d6d3d1]">
                Tie-break al {detail.tournament.config.rules.tiebreakAt}-{detail.tournament.config.rules.tiebreakAt}.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Grupos</p>
            <h2 className="mt-2 font-[family:var(--font-display)] text-3xl tracking-tight">Calendario y clasificación</h2>
          </div>
          {detail.groups.length ? (
            <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
              {detail.groups.length} grupos generados
            </Badge>
          ) : null}
        </div>

        {!detail.groups.length ? (
          <Card className="rounded-[28px] border-dashed">
            <p className="text-sm text-[#d6d3d1]">
              Aún no existe la fase de grupos. {isOrganizer ? "Usa el botón de arriba para generarla." : "El organizer todavía no ha publicado el calendario."}
            </p>
          </Card>
        ) : null}

        {detail.groups.map((groupView) => (
          <Card key={groupView.group.id}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">{groupView.group.name}</p>
                <h3 className="mt-2 font-[family:var(--font-display)] text-3xl tracking-tight">
                  Clasificación actual
                </h3>
              </div>
              <div className="min-w-0 lg:w-[28rem]">
                <StandingsTable detail={detail} rows={groupView.standings} />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {groupView.matches.map((match) => {
                const home = labelForSide(detail, match.sides[0]);
                const away = labelForSide(detail, match.sides[1]);
                const canReport = userCanReportMatch(match, currentUser.id, isOrganizer);

                return (
                  <article key={match.id} className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Home</p>
                          <p className="mt-2 font-semibold">{home.title}</p>
                          <p className="text-sm text-[#d6d3d1]">{home.subtitle}</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-[#fde68a]">
                            {match.validatedSubmission
                              ? summarizeSubmission(match.validatedSubmission.sets)
                              : match.latestSubmission
                                ? "Pendiente review"
                                : "Sin marcador"}
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Away</p>
                          <p className="mt-2 font-semibold">{away.title}</p>
                          <p className="text-sm text-[#d6d3d1]">{away.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                          {match.roundLabel}
                        </Badge>
                        <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                          {match.court || "Sin pista"}
                        </Badge>
                        <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                          {formatDateTimeLabel(match.scheduledAt)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-3">
                      {isOrganizer ? (
                        <form action={updateMatchAction} className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4">
                          <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                          <input name="matchId" type="hidden" value={match.id} />
                          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Horario y pista</p>
                          <input
                            className="field-input"
                            defaultValue={toDateTimeLocalInput(match.scheduledAt)}
                            name="scheduledAt"
                            type="datetime-local"
                          />
                          <input className="field-input" defaultValue={match.court ?? ""} name="court" placeholder="Pista 1" />
                          <Button type="submit" variant="secondary">
                            Guardar partido
                          </Button>
                        </form>
                      ) : (
                        <div className="rounded-[24px] border border-white/10 bg-black/15 p-4 text-sm text-[#d6d3d1]">
                          <div className="flex items-center gap-2 text-[#fde68a]">
                            <Clock3 className="size-4" />
                            Estado: {match.status}
                          </div>
                          {match.latestSubmission?.notes ? (
                            <p className="mt-3">{match.latestSubmission.notes}</p>
                          ) : null}
                        </div>
                      )}

                      {isOrganizer &&
                      detail.tournament.mode === "individual_ranking" &&
                      match.groupId ? (
                        <form action={updateIndividualPairingAction} className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4">
                          <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                          <input name="matchId" type="hidden" value={match.id} />
                          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Ajustar parejas</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <select className="field-select" defaultValue={match.sides[0].playerIds[0]} name="homePlayer1Id">
                              {playerOptions.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.fullName}
                                </option>
                              ))}
                            </select>
                            <select className="field-select" defaultValue={match.sides[0].playerIds[1]} name="homePlayer2Id">
                              {playerOptions.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.fullName}
                                </option>
                              ))}
                            </select>
                            <select className="field-select" defaultValue={match.sides[1].playerIds[0]} name="awayPlayer1Id">
                              {playerOptions.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.fullName}
                                </option>
                              ))}
                            </select>
                            <select className="field-select" defaultValue={match.sides[1].playerIds[1]} name="awayPlayer2Id">
                              {playerOptions.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Button type="submit" variant="secondary">
                            Actualizar parejas
                          </Button>
                        </form>
                      ) : (
                        <div className="rounded-[24px] border border-white/10 bg-black/15 p-4 text-sm text-[#d6d3d1]">
                          <div className="flex items-center gap-2 text-[#fde68a]">
                            <Flag className="size-4" />
                            Último estado de marcador
                          </div>
                          <p className="mt-3">
                            {match.latestSubmission
                              ? summarizeSubmission(match.latestSubmission.sets)
                              : "Nadie ha enviado resultado todavía."}
                          </p>
                          {match.latestSubmission?.notes ? (
                            <p className="mt-2 text-xs text-[#a8a29e]">{match.latestSubmission.notes}</p>
                          ) : null}
                        </div>
                      )}

                      {canReport ? (
                        <form action={submitScoreAction} className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4">
                          <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                          <input name="matchId" type="hidden" value={match.id} />
                          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
                            {match.validatedSubmission ? "Enviar corrección" : "Subir resultado"}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {[1, 2, 3].map((setIndex) => (
                              <div key={setIndex} className="grid gap-2 rounded-[18px] border border-white/10 bg-white/5 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Set {setIndex}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <input className="field-input" min="0" name={`set${setIndex}Home`} placeholder="H" type="number" />
                                  <input className="field-input" min="0" name={`set${setIndex}Away`} placeholder="A" type="number" />
                                </div>
                              </div>
                            ))}
                          </div>
                          <textarea className="field-textarea" name="notes" placeholder="Notas opcionales para revisión..." />
                          <Button type="submit">
                            {match.validatedSubmission ? "Enviar nuevo marcador" : "Mandar a validación"}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      {isOrganizer && detail.pendingSubmissions.length ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Review queue</p>
            <h2 className="mt-2 font-[family:var(--font-display)] text-3xl tracking-tight">Resultados pendientes de validar</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {detail.pendingSubmissions.map((submission) => (
              <Card key={submission.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">Submission</p>
                    <p className="mt-2 text-xl font-semibold">
                      {summarizeSubmission(submission.sets)}
                    </p>
                    <p className="mt-2 text-sm text-[#d6d3d1]">
                      Enviado por {profileMap.get(submission.submittedBy)?.fullName ?? "Jugador"}
                    </p>
                  </div>
                  <CheckCircle2 className="size-5 text-[#fde68a]" />
                </div>
                {submission.notes ? (
                  <p className="mt-4 rounded-[18px] border border-white/10 bg-white/5 p-3 text-sm text-[#d6d3d1]">
                    {submission.notes}
                  </p>
                ) : null}
                <div className="mt-5 flex gap-3">
                  <form action={reviewSubmissionAction}>
                    <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                    <input name="submissionId" type="hidden" value={submission.id} />
                    <input name="nextStatus" type="hidden" value="validated" />
                    <Button type="submit">Validar</Button>
                  </form>
                  <form action={reviewSubmissionAction}>
                    <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                    <input name="submissionId" type="hidden" value={submission.id} />
                    <input name="nextStatus" type="hidden" value="rejected" />
                    <Button type="submit" variant="danger">
                      Rechazar
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Knockout</p>
            <h2 className="mt-2 font-[family:var(--font-display)] text-3xl tracking-tight">Cuadro final</h2>
          </div>
          {isOrganizer && !detail.knockoutRounds.length && detail.groups.length ? (
            detail.tournament.mode === "fixed_pairs" ? (
              <form action={generateKnockoutAction}>
                <input name="tournamentId" type="hidden" value={detail.tournament.id} />
                <Button type="submit">Generar cuadro automáticamente</Button>
              </form>
            ) : null
          ) : null}
        </div>

        {canCreateIndividualKnockout ? (
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Sembrado manual</p>
            <p className="mt-3 text-sm leading-7 text-[#d6d3d1]">
              Selecciona {detail.tournament.config.knockoutSize} parejas usando a los jugadores clasificados. No se pueden repetir.
            </p>
            <form action={configureIndividualKnockoutAction} className="mt-5 grid gap-4">
              <input name="tournamentId" type="hidden" value={detail.tournament.id} />
              <input name="pairCount" type="hidden" value={detail.tournament.config.knockoutSize} />
              {Array.from({ length: detail.tournament.config.knockoutSize }, (_, index) => (
                <div key={`pair-${index}`} className="grid gap-3 rounded-[22px] border border-white/10 bg-black/15 p-4 md:grid-cols-[0.8fr_1fr_1fr]">
                  <input className="field-input" defaultValue={`Pareja ${index + 1}`} name={`pair${index}Label`} />
                  <select className="field-select" name={`pair${index}Player1`} required>
                    <option value="">Jugador 1</option>
                    {qualifiers.map((player) => (
                      <option key={`${player.playerId}-first-${index}`} value={player.playerId}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  <select className="field-select" name={`pair${index}Player2`} required>
                    <option value="">Jugador 2</option>
                    {qualifiers.map((player) => (
                      <option key={`${player.playerId}-second-${index}`} value={player.playerId}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <Button type="submit">Crear eliminatoria manual</Button>
            </form>
          </Card>
        ) : null}

        <KnockoutBracket detail={detail} />
      </section>
    </div>
  );
}
