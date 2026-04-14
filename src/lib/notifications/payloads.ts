export type EmailPayloadInput =
  | { kind: 'inscription_new'; tournamentName: string; actorName: string }
  | { kind: 'tournament_open'; tournamentName: string; inviteUrl: string }
  | { kind: 'tournament_started'; tournamentName: string; tournamentUrl: string }
  | { kind: 'result_reported'; tournamentName: string; matchLabel: string; sets: ReadonlyArray<readonly [number, number]> }
  | { kind: 'result_validated'; tournamentName: string; matchLabel: string; sets: ReadonlyArray<readonly [number, number]> };

export type EmailPayload = Readonly<{
  subject: string;
  html: string;
  text: string;
}>;

const layout = (inner: string) =>
  `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px;background:#fafaf7;color:#18181b">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
  <h1 style="font-size:20px;margin:0 0 16px">Padeljarto</h1>${inner}</div></body></html>`;

const setsToString = (sets: ReadonlyArray<readonly [number, number]>) =>
  sets.map(([a, b]) => `${a}-${b}`).join(' · ');

export function buildPayload(input: EmailPayloadInput): EmailPayload {
  switch (input.kind) {
    case 'inscription_new':
      return {
        subject: `Nueva inscripción — ${input.tournamentName}`,
        html: layout(`<p><strong>${input.actorName}</strong> se ha inscrito en <em>${input.tournamentName}</em>.</p>`),
        text: `${input.actorName} se ha inscrito en ${input.tournamentName}.`,
      };
    case 'tournament_open':
      return {
        subject: `Inscripciones abiertas — ${input.tournamentName}`,
        html: layout(`<p>Ya puedes inscribirte en <strong>${input.tournamentName}</strong>.</p><p><a href="${input.inviteUrl}" style="color:#6d28d9">Inscribirme</a></p>`),
        text: `Ya puedes inscribirte en ${input.tournamentName}: ${input.inviteUrl}`,
      };
    case 'tournament_started':
      return {
        subject: `Torneo en marcha — ${input.tournamentName}`,
        html: layout(`<p>${input.tournamentName} ha comenzado. Consulta tu cuadro.</p><p><a href="${input.tournamentUrl}">Ver torneo</a></p>`),
        text: `${input.tournamentName} ha comenzado: ${input.tournamentUrl}`,
      };
    case 'result_reported':
      return {
        subject: `resultado pendiente de validar — ${input.tournamentName}`,
        html: layout(`<p><strong>${input.matchLabel}</strong></p><p>Sets: ${setsToString(input.sets)}</p>`),
        text: `${input.matchLabel} — Sets: ${setsToString(input.sets)} (pendiente de validar)`,
      };
    case 'result_validated':
      return {
        subject: `Resultado validado — ${input.tournamentName}`,
        html: layout(`<p><strong>${input.matchLabel}</strong></p><p>Sets: ${setsToString(input.sets)}</p><p>Los ratings han sido actualizados.</p>`),
        text: `${input.matchLabel} — Sets: ${setsToString(input.sets)} (validado)`,
      };
    default: {
      const _exhaustive: never = input;
      throw new Error(`unknown notification kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
