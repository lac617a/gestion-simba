/** Estado de intentos fallidos de una clave (conexión o correo). */
export type ThrottleState = { failures: number; firstFailureAt: Date; lockedUntil: Date | null };

/** Tantos fallos dentro de la ventana → bloqueo por `lockMs`. */
export type ThrottleRule = { maxFailures: number; windowMs: number; lockMs: number };

const MIN = 60_000;

/** Por conexión (IP): 5 fallos en 15 min → 15 min bloqueado. */
export const IP_RULE: ThrottleRule = { maxFailures: 5, windowMs: 15 * MIN, lockMs: 15 * MIN };
/** Por correo: 20 fallos en 1 h → 15 min bloqueado (frena ataques desde muchas IP). */
export const EMAIL_RULE: ThrottleRule = { maxFailures: 20, windowMs: 60 * MIN, lockMs: 15 * MIN };

/** Minutos que faltan de bloqueo (redondeado hacia arriba), o 0 si no está bloqueado. */
export function lockedMinutes(state: ThrottleState | null, now: Date): number {
  if (!state?.lockedUntil || state.lockedUntil <= now) return 0;
  return Math.ceil((state.lockedUntil.getTime() - now.getTime()) / MIN);
}

/** Estado tras un intento fallido. Si la ventana ya venció, empieza a contar de nuevo. */
export function registerFailure(state: ThrottleState | null, now: Date, rule: ThrottleRule): ThrottleState {
  const fresh = !state || now.getTime() - state.firstFailureAt.getTime() > rule.windowMs;
  const failures = fresh ? 1 : state.failures + 1;
  const firstFailureAt = fresh ? now : state.firstFailureAt;
  const lockedUntil = failures >= rule.maxFailures ? new Date(now.getTime() + rule.lockMs) : null;
  return { failures, firstFailureAt, lockedUntil };
}
