export const TOURNAMENT_STATUS = ['draft', 'open', 'groups', 'knockout', 'complete'] as const;
export const PAIRING_MODE = ['pre_inscribed', 'draw', 'mixed'] as const;
export const MATCH_PHASE = ['group', 'R32', 'R16', 'QF', 'SF', 'F'] as const;
export const RESULT_STATUS = ['reported', 'validated', 'disputed', 'walkover', 'corrected'] as const;

export const ALLOWED_PLAYOFF_CUTOFFS = [0, 1, 2, 4, 8, 16] as const;

export const INVITATION_TOKEN_BYTES = 24;      // 24 bytes → 32 URL-safe base64 chars
export const INVITATION_TTL_DAYS = 7;

export const ELO_BASE = 1200;
export const ELO_K = 32;
export const ELO_K_NEWCOMER = 48;
export const ELO_NEWCOMER_THRESHOLD = 10;

export const RATE_LIMIT_PER_MINUTE = 10;
