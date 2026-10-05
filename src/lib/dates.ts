/**
 * Fechas de calendario como texto "YYYY-MM-DD" (día local del restaurante).
 * En la BD se guardan como @db.Date, que Prisma devuelve a medianoche UTC.
 */
export type ISODate = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  return dateToISO(isoToDate(value)) === value; // descarta 2026-02-30, etc.
}

export function isoToDate(iso: ISODate) {
  return new Date(`${iso}T00:00:00Z`);
}

export function dateToISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToISO(d);
}

/** 0 = domingo ... 6 = sábado */
export function weekdayOf(iso: ISODate) {
  return isoToDate(iso).getUTCDay();
}

export function daysBetween(from: ISODate, to: ISODate) {
  return Math.round((isoToDate(to).getTime() - isoToDate(from).getTime()) / 86_400_000);
}

/**
 * Día de trabajo actual en la zona del restaurante. Antes de `cutoffHour`
 * todavía cuenta como el día anterior (para locales que cierran de madrugada).
 */
export function todayISO(timeZone: string, cutoffHour = 0, now = new Date()): ISODate {
  const shifted = new Date(now.getTime() - cutoffHour * 3_600_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

/** Fecha de calendario y hora ("HH:MM") en una zona horaria. */
export type LocalNow = { date: ISODate; time: string };

/** Fecha y hora actuales en la zona del restaurante (sin la hora de corte: es el reloj). */
export function localNow(timeZone: string, now = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Instante (UTC) de una fecha y hora locales de la zona. Ej. 2026-10-03 19:30 en Bogotá → 2026-10-04T00:30Z. */
export function zonedToUtc(date: ISODate, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Diferencia entre el reloj de la zona y UTC en un instante dado.
  const offset = (t: number) => {
    const n = localNow(timeZone, new Date(t));
    const [ny, nmo, nd] = n.date.split("-").map(Number);
    const [nh, nmi] = n.time.split(":").map(Number);
    return Date.UTC(ny, nmo - 1, nd, nh, nmi) - Math.floor(t / 60_000) * 60_000;
  };
  // Dos pasadas por si el cambio de horario (donde lo haya) cae en medio.
  const first = wall - offset(wall);
  return new Date(wall - offset(first));
}

const longFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dayMonthFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "sábado, 3 de octubre" (sin año; para mensajes) */
export function formatDayMonth(iso: ISODate) {
  return dayMonthFormat.format(isoToDate(iso));
}

const dayMonthShortFormat = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short" });

/** "22 de oct" (sin año ni día de la semana) */
export function formatDayMonthShort(iso: ISODate) {
  return dayMonthShortFormat.format(isoToDate(iso));
}

/** "martes, 23 de septiembre de 2026" */
export function formatLongDate(iso: ISODate) {
  return longFormat.format(isoToDate(iso));
}

/** "23 sept 2026" */
export function formatShortDate(iso: ISODate) {
  return shortFormat.format(isoToDate(iso));
}

const dayFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Para filas de tablas: "lun, 21 sept" */
export function formatDayShort(iso: ISODate) {
  return dayFormat.format(isoToDate(iso));
}

/** Rango compacto: "21–27 de sept de 2026", "28 de sept – 4 de oct de 2026" */
export function formatDateRange(from: ISODate, to: ISODate) {
  return shortFormat.formatRange(isoToDate(from), isoToDate(to));
}
