import type { Match } from './types';

const PHASE_LABEL: Record<Match['phase'], string> = {
  group: 'Grupo',
  R32: 'Dieciseisavos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinal',
  F: 'Final',
};

export function matchLabel(match: Match): string {
  return PHASE_LABEL[match.phase];
}
