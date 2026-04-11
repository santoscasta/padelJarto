import type { TournamentStatus } from "./types";

const VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  draft: ['published', 'cancelled'],
  published: ['in_progress', 'cancelled', 'draft'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],
};

export function canTransition(from: TournamentStatus, to: TournamentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(status: TournamentStatus): TournamentStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function transitionLabel(status: TournamentStatus): string {
  const labels: Record<TournamentStatus, string> = {
    draft: 'Borrador',
    published: 'Publicado',
    in_progress: 'En curso',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return labels[status] ?? status;
}
