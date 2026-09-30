import { weekdayOf } from "@/lib/dates";
import type { DaySchedule } from "@/lib/schedule";

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

/** Horario de un día: el de su día de la semana. Día marcado como cerrado → null. */
export function hoursFor(schedule: DaySchedule, openingHours: string[]): OpeningHours | null {
  if (!schedule.open) return null;
  return parseHours(openingHours[weekdayOf(schedule.date)]);
}

const NBSP = String.fromCharCode(0xa0);

/**
 * "22:00" → "10:00 p. m." Se arma a mano y no con Intl: Node y cada navegador
 * separan "p. m." con espacios distintos, y en componentes de cliente eso rompe
 * la hidratación. Mismo texto que daba Intl en el servidor (es-CO).
 */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a." : "p."}${NBSP}m.`;
}

/** "12:00 p. m. a 10:00 p. m." */
export function formatHours(h: OpeningHours) {
  return `${formatTime(h.open)} a ${formatTime(h.close)}`;
}
