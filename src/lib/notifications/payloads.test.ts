import { describe, it, expect } from 'vitest';
import { buildPayload } from './payloads';

describe('buildPayload', () => {
  it('formats inscription_new payload', () => {
    const p = buildPayload({
      kind: 'inscription_new',
      tournamentName: 'Liga Primavera',
      actorName: 'Ana',
    });
    expect(p.subject).toContain('Liga Primavera');
    expect(p.html).toContain('Ana');
    expect(p.text).toContain('Ana');
  });

  it('formats result_reported payload with set scores', () => {
    const p = buildPayload({
      kind: 'result_reported',
      tournamentName: 'Liga Primavera',
      matchLabel: 'Grupo A · Jornada 1',
      sets: [[6, 4], [3, 6], [10, 8]],
    });
    expect(p.subject).toContain('resultado');
    expect(p.html).toContain('6-4');
    expect(p.html).toContain('10-8');
  });

  it('rejects unknown kind at runtime', () => {
    expect(() =>
      buildPayload({ kind: 'bogus', tournamentName: 'x' } as unknown as Parameters<typeof buildPayload>[0]),
    ).toThrow(/unknown notification kind/i);
  });
});
