import { addDays, weekdayOf, type ISODate, type LocalNow } from "@/lib/dates";
import { parseHours, type OpeningHours } from "@/lib/hours";

/** Cada cuánto se ofrecen horas para reservar. */
export const SLOT_MINUTES = 30;

/** Horas que se ofrecen si el día no tiene horario en Configuración. */
export const FALLBACK_HOURS: OpeningHours = { open: "11:00", close: "23:00" };

/** Margen para no rechazar una hora que se eligió hace un momento (ej. 7:30 elegida a las 7:29). */
export const PAST_GRACE_MINUTES = 10;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Horas para reservar: desde que abre hasta media hora antes de cerrar, cada 30 minutos. */
export function timeSlots(hours: OpeningHours | null, step = SLOT_MINUTES): string[] {
  const { open, close } = hours ?? FALLBACK_HOURS;
  const slots: string[] = [];
  // Empieza en la primera media hora exacta desde la apertura (12:15 → 12:30).
  for (let m = Math.ceil(toMinutes(open) / step) * step; m <= toMinutes(close) - step; m += step) slots.push(toTime(m));
  return slots;
}

/** Horario del día según su día de la semana (Configuración → Horario de atención). */
export function hoursOn(date: ISODate, openingHours: string[]): OpeningHours | null {
  return parseHours(openingHours[weekdayOf(date)]);
}

/** Si la fecha y hora ya pasaron, con `graceMinutes` de margen. */
export function isPastSlot(date: ISODate, time: string, now: LocalNow, graceMinutes = 0): boolean {
  if (date !== now.date) return date < now.date;
  return toMinutes(time) < toMinutes(now.time) - graceMinutes;
}

/** Hoy y los días siguientes, para elegir la fecha con un toque. */
export function quickDates(today: ISODate, count = 7): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

const weekdayShort = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "short" });
const dayMonthShort = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short" });

/** Botón de fecha: { top: "Hoy" | "Mañana" | "jue", bottom: "1 oct" }. */
export function quickDateLabel(date: ISODate, today: ISODate) {
  const d = Date.parse(`${date}T00:00:00Z`);
  const top = date === today ? "Hoy" : date === addDays(today, 1) ? "Mañana" : weekdayShort.format(d).replace(".", "");
  return { top, bottom: dayMonthShort.format(d).replace(" de ", " ").replace(".", "") }; // "1 de oct" → "1 oct"
}
