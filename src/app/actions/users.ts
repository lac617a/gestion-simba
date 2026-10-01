"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { UserRole } from "@/generated/prisma/enums";
import { verifyAdmin } from "@/lib/dal";
import { withAviso } from "@/lib/search-params";
import { db } from "@/lib/db";
import { parseUserForm, UserName, type UserFieldErrors } from "@/lib/users";

export type UserFormValues = { name: string; email: string; role: UserRole | "" };
export type UserFormState = { errors?: UserFieldErrors; message?: string; values?: UserFormValues } | undefined;

/** Lo enviado (sin contraseñas), para volver a mostrarlo si hay error. */
function submittedValues(formData: FormData): UserFormValues {
  const get = (k: string) => String(formData.get(k) ?? "");
  const role = get("role");
  return { name: get("name"), email: get("email"), role: role === "ADMIN" || role === "RESERVATIONS" ? role : "" };
}

async function emailTaken(email: string, exceptId?: string) {
  return !!(await db.user.findFirst({ where: { email, ...(exceptId && { id: { not: exceptId } }) }, select: { id: true } }));
}

function refresh() {
  revalidatePath("/gestion/usuarios", "layout");
  revalidatePath("/gestion/configuracion");
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await verifyAdmin();
  const values = submittedValues(formData);
  const parsed = parseUserForm(formData, "new");
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  const { name, email, role, password } = parsed.data;
  if (await emailTaken(email)) return { errors: { email: ["Ese correo ya tiene usuario"] }, values };

  await db.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) } });
  refresh();
  redirect(withAviso("/gestion/usuarios", { aviso: "creado" }));
}

/**
 * Edita a otro usuario: nombre, correo, rol y (opcional) contraseña nueva.
 * Cambiar la contraseña cierra su sesión en todos lados. Sobre uno mismo solo
 * se cambia el nombre: el correo y la contraseña van en Configuración → Cuenta
 * (piden la contraseña actual), y el rol no, para no quedarse sin administrador.
 */
export async function updateUser(id: string, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const me = await verifyAdmin();
  const values = submittedValues(formData);
  if (!(await db.user.findUnique({ where: { id }, select: { id: true } }))) {
    return { message: "El usuario ya no existe", values };
  }

  if (id === me.userId) {
    // Solo el nombre: el resto del formulario va deshabilitado y se ignora.
    const name = UserName.safeParse(formData.get("name") ?? "");
    if (!name.success) return { errors: { name: [name.error.issues[0].message] }, values };
    await db.user.update({ where: { id }, data: { name: name.data } });
  } else {
    const parsed = parseUserForm(formData, "edit");
    if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
    const { name, email, role, password } = parsed.data;
    if (await emailTaken(email, id)) return { errors: { email: ["Ese correo ya tiene usuario"] }, values };
    await db.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        ...(password && { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } }),
      },
    });
  }
  refresh();
  redirect(withAviso("/gestion/usuarios", { aviso: "actualizado" }));
}

/** Desactiva (no puede entrar y se cierra su sesión) o reactiva a otro usuario. */
export async function setUserActive(id: string, active: boolean) {
  const me = await verifyAdmin();
  if (id === me.userId) return { ok: false as const, error: "No puedes desactivarte a ti mismo" };
  const { count } = await db.user.updateMany({
    where: { id },
    data: { active, ...(!active && { sessionVersion: { increment: 1 } }) },
  });
  if (count === 0) return { ok: false as const, error: "El usuario ya no existe" };
  refresh();
  return { ok: true as const };
}
