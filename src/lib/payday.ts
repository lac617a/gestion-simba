import { addDays, weekdayOf, type ISODate } from "@/lib/dates";
import { isMondayHoliday } from "@/lib/holidays";
import { weekRange, type Period } from "@/lib/periods";

/**
 * Calendario de pago: cuál es la semana de pago y cuándo se paga.
 * - Normal: la semana empieza el `weekStart`, dura 7 días y se paga el primer
 *   `payDay` desde su último día (ej. lunes a domingo, pago el lunes siguiente).
 * - Lunes festivo (los de `extended`): ese lunes no abre semana, se suma a la
 *   anterior (lunes a lunes, 8 días); el pago que caía ese lunes pasa al martes
 *   y la semana siguiente va de martes a domingo.
 */
export type PayCalendar = {
  /** Día en que empieza la semana de pago (0 = domingo … 6 = sábado) */
  weekStart: number;
  /** Día en que se paga la semana que terminó */
  payDay: number;
  /** Lunes festivos que alargan la semana (los que no se apagaron en Configuración) */
  extended: { has(date: ISODate): boolean };
};

export function payCalendar(settings: {
  payWeekStart: number;
  payDay: number;
  /** Lunes festivos ("YYYY-MM-DD") en los que se pidió la semana normal */
  payHolidaysOff: readonly string[];
}): PayCalendar {
  const off = new Set(settings.payHolidaysOff);
  return {
    weekStart: settings.payWeekStart,
    payDay: settings.payDay,
    extended: { has: (date) => isMondayHoliday(date) && !off.has(date) },
  };
}

/** Semana de pago que contiene `date`. */
export function payWeekOf(date: ISODate, cal: PayCalendar): Period {
  let nominal = weekRange(date, cal.weekStart);
  // Un lunes festivo que abría semana pertenece a la anterior.
  if (date === nominal.from && cal.extended.has(date)) nominal = weekRange(addDays(date, -1), cal.weekStart);
  const next = addDays(nominal.to, 1);
  return {
    from: cal.extended.has(nominal.from) ? addDays(nominal.from, 1) : nominal.from,
    to: cal.extended.has(next) ? next : nominal.to,
  };
}

/** Semana de pago anterior (-1) o siguiente (+1). */
export function shiftPayWeek(week: Period, dir: 1 | -1, cal: PayCalendar): Period {
  return payWeekOf(dir < 0 ? addDays(week.from, -1) : addDays(week.to, 1), cal);
}

/** `period` es exactamente una semana de pago. */
export function isPayWeek(period: Period, cal: PayCalendar): boolean {
  const week = payWeekOf(period.from, cal);
  return week.from === period.from && week.to === period.to;
}

/**
 * Lunes festivos que movieron los bordes de una semana de pago: el que la hace
 * empezar el martes (`startsAfter`) y el que la alarga hasta el lunes (`endsOn`).
 */
export function weekHolidays(week: Period, cal: PayCalendar): { startsAfter: ISODate | null; endsOn: ISODate | null } {
  const before = addDays(week.from, -1);
  const opensWeek = (date: ISODate) => weekdayOf(date) === cal.weekStart && cal.extended.has(date);
  return { startsAfter: opensWeek(before) ? before : null, endsOn: opensWeek(week.to) ? week.to : null };
}

/**
 * Día en que se paga una semana: el primer `payDay` desde su último día (el
 * de siempre, sin contar el lunes festivo que la alargó). Si cae en un lunes
 * festivo, se paga el martes.
 */
export function payDateOf(week: Period, cal: PayCalendar): ISODate {
  const lastDay = weekHolidays(week, cal).endsOn ? addDays(week.to, -1) : week.to;
  const date = addDays(lastDay, (cal.payDay - weekdayOf(lastDay) + 7) % 7);
  return cal.extended.has(date) ? addDays(date, 1) : date;
}

/**
 * Semana que toca pagar y cuándo.
 * - upcoming: el pago es más adelante (ej. semana de pago de martes a lunes y pago el miércoles)
 * - today: hoy es día de pago
 * - late: ya pasó el día de pago
 */
export type PayDue = { week: Period; payDate: ISODate; status: "upcoming" | "today" | "late" };

export function payDue(today: ISODate, cal: PayCalendar): PayDue {
  const current = payWeekOf(today, cal);
  // Solo la semana en curso si hoy es su día de pago (se paga el último día); si no, la anterior.
  const week = payDateOf(current, cal) === today ? current : shiftPayWeek(current, -1, cal);
  const payDate = payDateOf(week, cal);
  return { week, payDate, status: payDate > today ? "upcoming" : payDate === today ? "today" : "late" };
}
