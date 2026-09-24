import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;

/** v = User.sessionVersion al crear la sesión; si cambia, la cookie deja de valer. */
type SessionPayload = { userId: string; v: number };

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta SESSION_SECRET en el entorno");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    // Las cookies emitidas antes de existir la versión cuentan como versión 0.
    return { userId: payload.userId, v: typeof payload.v === "number" ? payload.v : 0 };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, sessionVersion: number) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await encrypt({ userId, v: sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
