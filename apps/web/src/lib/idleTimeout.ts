export const IDLE_LOGOUT_MS = 30 * 60 * 1000;

/** True once the user has been inactive for at least `limitMs`. */
export function isIdleExpired(lastActivityMs: number, nowMs: number, limitMs: number = IDLE_LOGOUT_MS): boolean {
  return nowMs - lastActivityMs >= limitMs;
}
