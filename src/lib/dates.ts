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

/** "martes, 23 de septiembre de 2026" */
export function formatLongDate(iso: ISODate) {
  return longFormat.format(isoToDate(iso));
}

/** "23 sept 2026" */
export function formatShortDate(iso: ISODate) {
  return shortFormat.format(isoToDate(iso));
}

/** Rango compacto: "21–27 de sept de 2026", "28 de sept – 4 de oct de 2026" */
export function formatDateRange(from: ISODate, to: ISODate) {
  return shortFormat.formatRange(isoToDate(from), isoToDate(to));
}
