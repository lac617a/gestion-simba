"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import type { ActionResult } from "@/app/actions/attendance";
import { parseAccountForm, parseSettingsForm, type AccountFieldErrors } from "@/lib/account";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export type AccountState =
  | { errors?: AccountFieldErrors; message?: string; success?: string; email?: string }
  | undefined;

/**
 * Cambia el correo y/o la contraseña del admin. Pide la contraseña actual.
 * Al cambiar la contraseña se cierran las sesiones de los demás dispositivos
 * (sube sessionVersion) y este dispositivo recibe una sesión nueva.
 */
export async function updateAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await verifySession();
  const email = String(formData.get("email") ?? "");
  const parsed = parseAccountForm(formData);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, email };

  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { errors: { currentPassword: ["La contraseña actual no es correcta"] }, email };
  }

  const changingPassword = parsed.data.newPassword !== "";
  const taken = await db.user.findFirst({ where: { email: parsed.data.email, id: { not: user.id } } });
  if (taken) return { errors: { email: ["Ese correo ya está en uso"] }, email };

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      email: parsed.data.email,
      ...(changingPassword && {
        passwordHash: await bcrypt.hash(parsed.data.newPassword, 10),
        sessionVersion: { increment: 1 },
      }),
    },
  });
  if (changingPassword) await createSession(updated.id, updated.sessionVersion);

  revalidatePath("/configuracion");
  return {
    success: changingPassword
      ? "Contraseña cambiada. Se cerró la sesión en los demás dispositivos."
      : "Correo actualizado.",
    email: updated.email,
  };
}

/** Cierra la sesión en todos los demás dispositivos; este sigue conectado. */
export async function logoutEverywhere(): Promise<ActionResult> {
  const session = await verifySession();
  const updated = await db.user.update({
    where: { id: session.userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await createSession(updated.id, updated.sessionVersion);
  return { ok: true };
}

export type SettingsState = { error?: string; success?: string } | undefined;

/** Guarda inicio de la semana de pago y días de cierre del restaurante. */
export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await verifySession();
  const parsed = parseSettingsForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.appSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
  revalidatePath("/", "layout"); // afecta Hoy, Asistencia, Pagos y Reportes
  return { success: "Ajustes guardados." };
}
