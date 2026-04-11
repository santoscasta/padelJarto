import type { MatchResultProposal, MatchResultValidation } from "./types";

/** Determine the winner from a set score array */
export function computeWinnerFromSets(sets: [number, number][]): 'home' | 'away' | null {
  let homeWins = 0;
  let awayWins = 0;
  for (const [home, away] of sets) {
    if (home > away) homeWins++;
    else if (away > home) awayWins++;
  }
  if (homeWins > awayWins) return 'home';
  if (awayWins > homeWins) return 'away';
  return null;
}

/** Check if a set score is valid (someone reached at least 6 games with 2+ lead, or tiebreak at 7-6/6-7) */
export function isValidSetScore(home: number, away: number): boolean {
  if (home < 0 || away < 0) return false;
  const max = Math.max(home, away);
  const min = Math.min(home, away);
  if (max < 6) return false; // nobody reached 6
  if (max === 6 && min <= 4) return true; // 6-0 to 6-4
  if (max === 7 && (min === 5 || min === 6)) return true; // 7-5 or 7-6
  return false;
}

/** Validate a complete match score */
export function validateMatchScore(sets: [number, number][], bestOfSets: number = 3): { valid: boolean; error?: string } {
  if (sets.length === 0) return { valid: false, error: "Se requiere al menos un set" };
  if (sets.length > bestOfSets) return { valid: false, error: `Maximo ${bestOfSets} sets` };

  for (let i = 0; i < sets.length; i++) {
    if (!isValidSetScore(sets[i][0], sets[i][1])) {
      return { valid: false, error: `Set ${i + 1}: marcador invalido (${sets[i][0]}-${sets[i][1]})` };
    }
  }

  const winner = computeWinnerFromSets(sets);
  if (!winner) return { valid: false, error: "No hay ganador claro" };

  // Check that the match ended when someone won majority
  const setsToWin = Math.ceil(bestOfSets / 2);
  let homeWins = 0;
  let awayWins = 0;
  for (let i = 0; i < sets.length; i++) {
    if (sets[i][0] > sets[i][1]) homeWins++;
    else awayWins++;
    // If someone already won the match, no more sets should follow
    if ((homeWins >= setsToWin || awayWins >= setsToWin) && i < sets.length - 1) {
      return { valid: false, error: "Se jugaron sets despues de decidido el partido" };
    }
  }

  return { valid: true };
}

/** Check if a proposal has enough validations to be confirmed */
export function isProposalConfirmed(
  validations: MatchResultValidation[],
  requiredAccepts: number = 1
): boolean {
  const accepts = validations.filter(v => v.decision === 'accept').length;
  const rejects = validations.filter(v => v.decision === 'reject').length;
  return accepts >= requiredAccepts && rejects === 0;
}

/** Check if a proposal is disputed */
export function isProposalDisputed(validations: MatchResultValidation[]): boolean {
  return validations.some(v => v.decision === 'reject');
}
