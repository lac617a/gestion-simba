import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { EMAIL_RULE, IP_RULE, lockedMinutes, registerFailure, type ThrottleRule } from "@/lib/throttle";

// Hash de relleno: si el correo no existe se compara igual, para no revelar por el tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync("usuario-inexistente", 10);

export type LoginResult =
  | { ok: true; userId: string; sessionVersion: number }
  | { ok: false; error: string };

/**
 * Verifica correo y contraseña con límite de intentos por conexión (IP) y por
 * correo. Un acceso correcto limpia los contadores de ambos.
 */
export async function attemptLogin(email: string, password: string, ip: string, now = new Date()): Promise<LoginResult> {
  const checks: { key: string; rule: ThrottleRule }[] = [
    { key: `ip:${ip}`, rule: IP_RULE },
    { key: `email:${email}`, rule: EMAIL_RULE },
  ];
  const states = await db.loginThrottle.findMany({ where: { key: { in: checks.map((c) => c.key) } } });
  const stateOf = new Map(states.map((s) => [s.key, s]));

  const wait = Math.max(...checks.map((c) => lockedMinutes(stateOf.get(c.key) ?? null, now)));
  if (wait > 0) {
    return { ok: false, error: `Demasiados intentos. Intenta de nuevo en ${wait} ${wait === 1 ? "minuto" : "minutos"}.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (user && valid) {
    await db.loginThrottle.deleteMany({ where: { key: { in: checks.map((c) => c.key) } } });
    return { ok: true, userId: user.id, sessionVersion: user.sessionVersion };
  }

  for (const { key, rule } of checks) {
    const next = registerFailure(stateOf.get(key) ?? null, now, rule);
    await db.loginThrottle.upsert({ where: { key }, update: next, create: { key, ...next } });
  }
  return { ok: false, error: "Correo o contraseña incorrectos" };
}
