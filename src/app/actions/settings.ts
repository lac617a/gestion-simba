"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import type { ActionResult } from "@/app/actions/attendance";
import { isSettingsGroup, parseAccountForm, parseSettingsGroup, type AccountFieldErrors, type SettingsGroup } from "@/lib/account";
import { sendBackupEmail } from "@/lib/backup-data";
import { DEFAULT_PAY_WEEK_START } from "@/lib/config";
import { verifyAdmin, verifyUser } from "@/lib/dal";
import { isISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { isMondayHoliday } from "@/lib/holidays";
import { createSession } from "@/lib/session";

export type AccountState =
  | { errors?: AccountFieldErrors; message?: string; success?: string; email?: string }
  | undefined;

/**
 * Cambia el correo y/o la contraseña del usuario que entró. Pide la contraseña actual.
 * Al cambiar la contraseña se cierran las sesiones de los demás dispositivos
 * (sube sessionVersion) y este dispositivo recibe una sesión nueva.
 */
export async function updateAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await verifyUser();
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

  revalidatePath("/gestion/configuracion", "layout");
  return {
    success: changingPassword
      ? "Contraseña cambiada. Se cerró la sesión en los demás dispositivos."
      : "Correo actualizado.",
    email: updated.email,
  };
}

/** Cierra la sesión en todos los demás dispositivos; este sigue conectado. */
export async function logoutEverywhere(): Promise<ActionResult> {
  const session = await verifyUser();
  const updated = await db.user.update({
    where: { id: session.userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await createSession(updated.id, updated.sessionVersion);
  return { ok: true };
}

export type SettingsState = { error?: string; success?: string } | undefined;

/** Guarda un grupo de ajustes del restaurante (cada pantalla de Configuración, el suyo). */
export async function updateSettings(group: SettingsGroup, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await verifyAdmin();
  if (!isSettingsGroup(group)) return { error: "Ajustes desconocidos." };
  const parsed = parseSettingsGroup(formData, group);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.appSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, payWeekStart: DEFAULT_PAY_WEEK_START, ...parsed.data },
  });
  revalidatePath("/", "layout"); // afecta Hoy, Asistencia, Pagos y Reportes
  return { success: "Guardado." };
}

/**
 * Un lunes festivo: alargar la semana de pago hasta ese lunes y pagar el martes
 * (lo normal, `extend`), o dejar esa semana como cualquier otra.
 */
export async function setHolidayWeek(date: string, extend: boolean): Promise<ActionResult> {
  await verifyAdmin();
  if (!isISODate(date) || !isMondayHoliday(date)) return { ok: false, error: "Ese día no es un lunes festivo." };

  const row = await db.appSettings.findUnique({ where: { id: 1 }, select: { payHolidaysOff: true } });
  const off = new Set(row?.payHolidaysOff);
  if (extend) off.delete(date);
  else off.add(date);
  const payHolidaysOff = [...off].sort();
  await db.appSettings.upsert({
    where: { id: 1 },
    update: { payHolidaysOff },
    create: { id: 1, payWeekStart: DEFAULT_PAY_WEEK_START, payHolidaysOff },
  });
  revalidatePath("/", "layout"); // cambia la semana en Hoy, Pagos, Reportes y Empleados
  return { ok: true };
}

export type BackupEmailState = { error?: string; success?: string } | undefined;

/** Correo que recibe el respaldo diario; vacío = sin respaldo por correo. */
export async function saveBackupEmail(_prev: BackupEmailState, formData: FormData): Promise<BackupEmailState> {
  await verifyAdmin();
  const backupEmail = String(formData.get("backupEmail") ?? "")
    .trim()
    .toLowerCase();
  if (backupEmail && !z.email().safeParse(backupEmail).success) return { error: "Ese correo no es válido." };

  await db.appSettings.upsert({
    where: { id: 1 },
    update: { backupEmail },
    create: { id: 1, payWeekStart: DEFAULT_PAY_WEEK_START, backupEmail },
  });
  revalidatePath("/gestion/configuracion", "layout");
  return { success: backupEmail ? "Correo de respaldos guardado." : "Respaldo por correo desactivado." };
}

/** "Enviar ahora": manda el respaldo al correo configurado aunque ya haya salido el de hoy. */
export async function sendBackupNow(): Promise<ActionResult> {
  await verifyAdmin();
  const result = await sendBackupEmail({ force: true });
  if (!result.enviado) return { ok: false, error: `No se pudo enviar: ${result.motivo}.` };
  revalidatePath("/gestion/configuracion", "layout");
  return { ok: true };
}
