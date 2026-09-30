import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { decrypt, SESSION_COOKIE } from "@/lib/session";
import { homeFor } from "@/lib/users";

export type SessionUser = { userId: string; v: number; role: UserRole; name: string | null; email: string };

/**
 * Verifica la sesión de cualquier usuario activo. El proxy solo hace una
 * comprobación optimista (firma de la cookie); aquí además se compara la
 * versión de sesión con la BD, para que un cambio de contraseña, "cerrar sesión
 * en todos lados" o desactivar al usuario invalide las cookies anteriores.
 * El rol se lee de la BD en cada petición: un cambio de rol aplica de inmediato.
 */
export const verifyUser = cache(async (): Promise<SessionUser> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) redirect("/gestion/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true, role: true, active: true, name: true, email: true },
  });
  // /salir borra la cookie (una página no puede hacerlo) y lleva al login.
  if (!user || !user.active || user.sessionVersion !== session.v) redirect("/gestion/salir");

  return { ...session, role: user.role, name: user.name, email: user.email };
});

/** Solo administradores. Llamar en cada página, Route Handler y Server Action de administración. */
export async function verifyAdmin() {
  const user = await verifyUser();
  if (user.role !== "ADMIN") redirect(homeFor(user.role));
  return user;
}

/** Reservas: administradores y usuarios de reservas. */
export async function verifyReservations() {
  const user = await verifyUser();
  if (user.role !== "ADMIN" && user.role !== "RESERVATIONS") redirect(homeFor(user.role));
  return user;
}
