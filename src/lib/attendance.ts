import * as z from "zod";
import type { AttendanceStatus, TimeOffType } from "@/generated/prisma/enums";
import { daysBetween, isISODate, weekdayOf, type ISODate } from "@/lib/dates";

/** Estados que se pueden elegir a mano (PENDING solo lo pone el sistema). */
export const SELECTABLE_STATUSES = ["WORKED", "REST", "EXTRA_REST", "ABSENT", "LEAVE"] as const satisfies readonly AttendanceStatus[];

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PENDING: "Pendiente",
  WORKED: "Trabajó",
  REST: "Descanso",
  EXTRA_REST: "Permiso",
  ABSENT: "Falta",
  LEAVE: "Vacaciones",
};

/** Clases del chip cuando el estado está seleccionado. */
export const STATUS_ACTIVE_CLASS: Record<AttendanceStatus, string> = {
  PENDING: "border-amber-500 bg-amber-50 text-amber-800",
  WORKED: "border-emerald-600 bg-emerald-600 text-white",
  REST: "border-slate-500 bg-slate-500 text-white",
  EXTRA_REST: "border-sky-600 bg-sky-600 text-white",
  ABSENT: "border-red-600 bg-red-600 text-white",
  LEAVE: "border-violet-600 bg-violet-600 text-white",
};

export const TIME_OFF_LABEL: Record<TimeOffType, string> = {
  EXTRA_REST: "Descanso extra / permiso",
  LEAVE: "Vacaciones / incapacidad",
};

export type TimeOffRange = { type: TimeOffType; startDate: ISODate; endDate: ISODate };

/**
 * Estado con el que arranca un empleado al abrir un día:
 * día libre asignado > descanso fijo semanal > pendiente.
 */
export function initialStatus(restDays: number[], date: ISODate, timeOff: TimeOffRange[]): AttendanceStatus {
  const covering = timeOff.filter((t) => t.startDate <= date && date <= t.endDate);
  if (covering.some((t) => t.type === "LEAVE")) return "LEAVE";
  if (covering.length) return "EXTRA_REST";
  if (restDays.includes(weekdayOf(date))) return "REST";
  return "PENDING";
}

export type AttendanceCounts = Record<AttendanceStatus, number>;

export function countByStatus(statuses: AttendanceStatus[]): AttendanceCounts {
  const counts: AttendanceCounts = { PENDING: 0, WORKED: 0, REST: 0, EXTRA_REST: 0, ABSENT: 0, LEAVE: 0 };
  for (const s of statuses) counts[s]++;
  return counts;
}

export const MAX_TIME_OFF_DAYS = 90;

const isoDate = z.string().refine(isISODate, { error: "Fecha inválida" });

export const TimeOffSchema = z
  .object({
    type: z.enum(["EXTRA_REST", "LEAVE"], { error: "Elige el tipo" }),
    startDate: isoDate,
    endDate: isoDate,
    note: z
      .string()
      .trim()
      .max(120, { error: "Máximo 120 caracteres" })
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => v.endDate >= v.startDate, {
    error: "Debe ser igual o posterior a la fecha de inicio",
    path: ["endDate"],
  })
  .refine((v) => daysBetween(v.startDate, v.endDate) < MAX_TIME_OFF_DAYS, {
    error: `Máximo ${MAX_TIME_OFF_DAYS} días por asignación`,
    path: ["endDate"],
  });

export type TimeOffFieldErrors = Partial<Record<"type" | "startDate" | "endDate" | "note", string[]>>;

export function parseTimeOffForm(formData: FormData) {
  return TimeOffSchema.safeParse({
    type: formData.get("type") ?? undefined,
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") || formData.get("startDate") || "",
    note: formData.get("note") ?? "",
  });
}
