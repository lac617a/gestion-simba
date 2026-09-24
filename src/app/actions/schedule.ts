"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions/attendance";
import { getSettings } from "@/lib/settings";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isISODate, isoToDate } from "@/lib/dates";
import { daySchedule } from "@/lib/schedule";

/**
 * Excepción manual a la regla de cierre de un día.
 * open = true abre un día de cierre; open = false cierra un día normal;
 * null quita la excepción y vuelve a la regla.
 *
 * Al cerrar un día se borra su asistencia sin cerrar (no aplica a días ya
 * cerrados con venta: hay que reabrirlos primero).
 */
export async function setDayOverride(date: string, open: boolean | null): Promise<ActionResult> {
  await verifySession();
  if (!isISODate(date)) return { ok: false, error: "Fecha inválida" };
  const d = isoToDate(date);

  // Si pide lo mismo que dice la regla, no hace falta guardar una excepción.
  const ruleOpen = daySchedule(date, (await getSettings()).closedWeekdays).open;
  const override = open === null || open === ruleOpen ? null : open;
  const willBeOpen = override ?? ruleOpen;

  if (!willBeOpen) {
    const day = await db.workDay.findUnique({ where: { date: d }, select: { id: true, status: true } });
    if (day?.status === "CLOSED") {
      return { ok: false, error: "Este día ya se cerró con su venta. Reábrelo primero si quieres marcarlo como cerrado." };
    }
    if (day) await db.workDay.delete({ where: { id: day.id } }); // borra también su asistencia
  }

  if (override === null) {
    await db.dayOverride.deleteMany({ where: { date: d } });
  } else {
    await db.dayOverride.upsert({ where: { date: d }, update: { open: override }, create: { date: d, open: override } });
  }

  revalidatePath("/asistencia");
  revalidatePath("/");
  return { ok: true };
}
