import { weekdayOf } from "@/lib/dates";
import type { DaySchedule } from "@/lib/schedule";

/** Índice de la fila "Festivos" en `openingHours` (0–6 son los días de la semana). */
export const HOLIDAY_ROW = 7;

/** Horario de atención de un día. Informativo: el día de trabajo sigue cambiando a medianoche. */
export type OpeningHours = { open: string; close: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "12:00-22:00" → { open, close }; vacío o mal formado → null. */
export function parseHours(value: string | undefined): OpeningHours | null {
  const [open, close] = (value ?? "").split("-");
  return TIME.test(open ?? "") && TIME.test(close ?? "") ? { open, close } : null;
}

export function serializeHours(h: OpeningHours | null) {
  return h ? `${h.open}-${h.close}` : "";
}

/**
 * Horario que aplica a un día abierto: el de festivos si es festivo y hay uno
 * configurado; si no, el de su día de la semana. Día cerrado → null.
 */
export function hoursFor(schedule: DaySchedule, openingHours: string[]): OpeningHours | null {
  if (!schedule.open) return null;
  const holiday = schedule.holiday ? parseHours(openingHours[HOLIDAY_ROW]) : null;
  return holiday ?? parseHours(openingHours[weekdayOf(schedule.date)]);
}

const timeFormat = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });

/** "22:00" → "10:00 p. m." */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return timeFormat.format(Date.UTC(2000, 0, 1, h, m));
}

/** "12:00 p. m. a 10:00 p. m." */
export function formatHours(h: OpeningHours) {
  return `${formatTime(h.open)} a ${formatTime(h.close)}`;
}
