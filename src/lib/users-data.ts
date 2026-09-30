import "server-only";
import { db } from "@/lib/db";

const USER_FIELDS = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

/** Usuarios de la administración: activos primero, luego por nombre. */
export async function getUsers() {
  const users = await db.user.findMany({ select: USER_FIELDS });
  const label = (u: { name: string | null; email: string }) => u.name?.trim() || u.email;
  return users.sort(
    (a, b) => Number(b.active) - Number(a.active) || label(a).localeCompare(label(b), "es", { sensitivity: "base" })
  );
}

export async function getUser(id: string) {
  return db.user.findUnique({ where: { id }, select: USER_FIELDS });
}
