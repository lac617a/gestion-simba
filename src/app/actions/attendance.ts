"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { SELECTABLE_STATUSES } from "@/lib/attendance";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isISODate, isoToDate } from "@/lib/dates";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CLOSED_ERROR: ActionResult = { ok: false, error: "El día está cerrado. Reábrelo para hacer cambios." };

export async function setAttendanceStatus(attendanceId: string, status: AttendanceStatus): Promise<ActionResult> {
  await verifySession();
  if (!(SELECTABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Estado inválido" };
  }
  const { count } = await db.attendance.updateMany({
    where: { id: attendanceId, workDay: { status: "OPEN" } },
    data: { status },
  });
  if (count === 0) return CLOSED_ERROR;
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function setAttendanceNote(attendanceId: string, note: string): Promise<ActionResult> {
  await verifySession();
  const clean = note.trim().slice(0, 200);
  const { count } = await db.attendance.updateMany({
    where: { id: attendanceId, workDay: { status: "OPEN" } },
    data: { note: clean === "" ? null : clean },
  });
  if (count === 0) return CLOSED_ERROR;
  revalidatePath("/asistencia");
  return { ok: true };
}

export async function markPendingAsWorked(date: string): Promise<ActionResult & { count?: number }> {
  await verifySession();
  if (!isISODate(date)) return { ok: false, error: "Fecha inválida" };
  const { count } = await db.attendance.updateMany({
    where: {
      status: "PENDING",
      employee: { active: true },
      workDay: { date: isoToDate(date), status: "OPEN" },
    },
    data: { status: "WORKED" },
  });
  revalidatePath("/asistencia");
  return { ok: true, count };
}
