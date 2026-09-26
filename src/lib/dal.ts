import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

/**
 * Verifica la sesión del admin. Llamar en cada página y Server Action protegida:
 * el proxy solo hace una comprobación optimista (firma de la cookie).
 * Aquí además se compara la versión de sesión con la BD, para que un cambio de
 * contraseña o "cerrar sesión en todos lados" invalide las cookies anteriores.
 */
export const verifySession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) redirect("/gestion/login");

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { sessionVersion: true } });
  // /salir borra la cookie (una página no puede hacerlo) y lleva al login.
  if (!user || user.sessionVersion !== session.v) redirect("/gestion/salir");

  return session;
});
