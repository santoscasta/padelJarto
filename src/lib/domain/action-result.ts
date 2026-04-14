export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RESULT_ALREADY_VALIDATED'
  | 'INVITATION_EXPIRED'
  | 'TOURNAMENT_FULL'
  | 'RATE_LIMITED'
  | 'UNEXPECTED';

export type ActionResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; code: ErrorCode; message: string; fields?: Readonly<Record<string, string>> }>;

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = <T = never>(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ActionResult<T> => (fields ? { ok: false, code, message, fields } : { ok: false, code, message });

export const isOk = <T>(r: ActionResult<T>): r is Extract<ActionResult<T>, { ok: true }> => r.ok;
export const isFail = <T>(r: ActionResult<T>): r is Extract<ActionResult<T>, { ok: false }> => !r.ok;
