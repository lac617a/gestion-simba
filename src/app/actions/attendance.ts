"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { SELECTABLE_STATUSES } from "@/lib/attendance";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isISODate, isoToDate } from "@/lib/dates";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CLOSED_ERROR: ActionResult = { ok: false, error: "El día está cerrado. Reábrelo para hacer cambios." };
const MORNING_CLOSED_ERROR: ActionResult = {
  ok: false,
  error: "El turno de la mañana ya se cerró. Reábrelo para cambiar quién lo hizo.",
};

/** Hizo el turno de la mañana (Mañana o Ambos). */
const inMorning = (status: AttendanceStatus, shift: WorkShift | null) =>
  status === "WORKED" && (shift === "MORNING" || shift === "BOTH");

async function loadAttendance(attendanceId: string) {
  return db.attendance.findUnique({
    where: { id: attendanceId },
    select: {
      status: true,
      shift: true,
      workDay: { select: { status: true, doubleShift: true, morningClosedAt: true } },
    },
  });
}

export async function setAttendanceStatus(attendanceId: string, status: AttendanceStatus): Promise<ActionResult> {
  await verifySession();
  if (!(SELECTABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Estado inválido" };
  }
  const a = await loadAttendance(attendanceId);
  if (!a || a.workDay.status !== "OPEN") return CLOSED_ERROR;

  // Doble turno: el turno se conserva si sigue en Trabajó; tras cerrar la mañana,
  // quien empieza a trabajar solo puede ser de la tarde.
  let shift: WorkShift | null = null;
  if (a.workDay.doubleShift && status === "WORKED") {
    shift = a.status === "WORKED" ? a.shift : a.workDay.morningClosedAt ? "EVENING" : null;
  }
  if (a.workDay.morningClosedAt && inMorning(a.status, a.shift) !== inMorning(status, shift)) {
    return MORNING_CLOSED_ERROR;
  }

  const { count } = await db.attendance.updateMany({
    where: { id: attendanceId, workDay: { status: "OPEN" } },
    data: { status, shift },
  });
  if (count === 0) return CLOSED_ERROR;
  revalidatePath("/gestion/asistencia");
  return { ok: true };
}

const SHIFTS: WorkShift[] = ["MORNING", "EVENING", "BOTH"];

/** Turno de quien trabajó en un día de doble turno: Mañana, Tarde o Ambos. */
export async function setAttendanceShift(attendanceId: string, shift: WorkShift): Promise<ActionResult> {
  await verifySession();
  if (!SHIFTS.includes(shift)) return { ok: false, error: "Turno inválido" };
  const a = await loadAttendance(attendanceId);
  if (!a || a.workDay.status !== "OPEN") return CLOSED_ERROR;
  if (!a.workDay.doubleShift) return { ok: false, error: "Este día no tiene doble turno." };
  if (a.status !== "WORKED") return { ok: false, error: "Primero márcalo como Trabajó." };
  if (a.workDay.morningClosedAt && inMorning(a.status, a.shift) !== inMorning("WORKED", shift)) {
    return MORNING_CLOSED_ERROR;
  }

  await db.attendance.update({ where: { id: attendanceId }, data: { shift } });
  revalidatePath("/gestion/asistencia");
  return { ok: true };
}

/**
 * Activa o quita el doble turno de un día abierto (por si ese día es distinto a
 * lo de Configuración). No se puede mientras el turno de la mañana esté cerrado.
 * Al quitarlo se borran los turnos y las propinas por turno de ese día.
 */
export async function setDoubleShift(date: string, doubleShift: boolean): Promise<ActionResult> {
  await verifySession();
  if (!isISODate(date)) return { ok: false, error: "Fecha inválida" };
  const day = await db.workDay.findUnique({
    where: { date: isoToDate(date) },
    select: { id: true, status: true, morningClosedAt: true },
  });
  if (!day || day.status !== "OPEN") return CLOSED_ERROR;
  if (day.morningClosedAt) return { ok: false, error: "El turno de la mañana ya se cerró. Reábrelo primero." };

  await db.$transaction([
    db.workDay.update({
      where: { id: day.id },
      data: doubleShift ? { doubleShift } : { doubleShift, tipsMorning: null, tipsEvening: null },
    }),
    ...(doubleShift ? [] : [db.attendance.updateMany({ where: { workDayId: day.id }, data: { shift: null } })]),
  ]);
  revalidatePath("/gestion/asistencia");
  revalidatePath("/gestion");
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
  revalidatePath("/gestion/asistencia");
  return { ok: true };
}

export async function markPendingAsWorked(date: string): Promise<ActionResult & { count?: number }> {
  await verifySession();
  if (!isISODate(date)) return { ok: false, error: "Fecha inválida" };
  const day = await db.workDay.findUnique({
    where: { date: isoToDate(date) },
    select: { doubleShift: true, morningClosedAt: true },
  });
  const { count } = await db.attendance.updateMany({
    where: {
      status: "PENDING",
      employee: { active: true },
      workDay: { date: isoToDate(date), status: "OPEN" },
    },
    // Tras cerrar la mañana, los que faltaban solo pueden ser de la tarde.
    data: { status: "WORKED", shift: day?.doubleShift && day.morningClosedAt ? "EVENING" : null },
  });
  revalidatePath("/gestion/asistencia");
  return { ok: true, count };
}
