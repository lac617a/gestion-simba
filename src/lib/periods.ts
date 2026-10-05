import { addDays, daysBetween, type ISODate } from "@/lib/dates";

/** Rango inclusivo de fechas. */
export type Period = { from: ISODate; to: ISODate };

/** Semana que contiene `date`, empezando en `weekStart` (0 = domingo … 6 = sábado). */
export function weekRange(date: ISODate, weekStart: number): Period {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const from = addDays(date, -((weekday - weekStart + 7) % 7));
  return { from, to: addDays(from, 6) };
}

function lastDayOfMonth(date: ISODate): ISODate {
  return addDays(addDays(`${date.slice(0, 7)}-28`, 4).slice(0, 7) + "-01", -1);
}

/** Mes calendario que contiene `date`. */
export function monthRange(date: ISODate): Period {
  return { from: `${date.slice(0, 7)}-01`, to: lastDayOfMonth(date) };
}

/** Quincena que contiene `date`: del 1 al 15, o del 16 a fin de mes. */
export function fortnightRange(date: ISODate): Period {
  const month = date.slice(0, 7);
  return Number(date.slice(8)) <= 15
    ? { from: `${month}-01`, to: `${month}-15` }
    : { from: `${month}-16`, to: lastDayOfMonth(date) };
}

const same = (a: Period, b: Period) => a.from === b.from && a.to === b.to;

/**
 * Periodo anterior (-1) o siguiente (+1). Meses y quincenas saltan al mes o
 * quincena vecina; cualquier otro rango se desplaza por su propio largo.
 */
export function shiftPeriod(p: Period, dir: 1 | -1): Period {
  const edge = dir < 0 ? addDays(p.from, -1) : addDays(p.to, 1);
  if (same(p, monthRange(p.from))) return monthRange(edge);
  if (same(p, fortnightRange(p.from))) return fortnightRange(edge);
  const length = daysBetween(p.from, p.to) + 1;
  return { from: addDays(p.from, dir * length), to: addDays(p.to, dir * length) };
}

/** Días del periodo que ya transcurrieron hasta `today` (inclusive). */
export function elapsedDays(p: Period, today: ISODate) {
  const last = p.to < today ? p.to : today;
  return last < p.from ? 0 : daysBetween(p.from, last) + 1;
}
