"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions/attendance";
import { verifyAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { isISODate, isoToDate } from "@/lib/dates";

/**
 * Cierra un día puntual (ej. 25 de diciembre) o lo vuelve a abrir.
 * El restaurante abre todos los días; un cierre se guarda como excepción
 * (DayOverride con open = false) y abrirlo la borra.
 *
 * Al cerrar un día se borra su asistencia sin cerrar (no aplica a días ya
 * cerrados con venta: hay que reabrirlos primero).
 */
export async function setDayClosed(date: string, closed: boolean): Promise<ActionResult> {
  await verifyAdmin();
  if (!isISODate(date)) return { ok: false, error: "Fecha inválida" };
  const d = isoToDate(date);

  if (closed) {
    const day = await db.workDay.findUnique({ where: { date: d }, select: { id: true, status: true } });
    if (day?.status === "CLOSED") {
      return { ok: false, error: "Este día ya se cerró con su venta. Reábrelo primero si quieres marcarlo como cerrado." };
    }
    if (day) await db.workDay.delete({ where: { id: day.id } }); // borra también su asistencia
    await db.dayOverride.upsert({ where: { date: d }, update: { open: false }, create: { date: d, open: false } });
  } else {
    await db.dayOverride.deleteMany({ where: { date: d } });
  }

  revalidatePath("/gestion/asistencia");
  revalidatePath("/gestion");
  revalidatePath("/"); // página pública ("hoy abrimos…")
  return { ok: true };
}
