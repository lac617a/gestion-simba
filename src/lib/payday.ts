import { addDays, weekdayOf, type ISODate } from "@/lib/dates";
import { weekRange, type Period } from "@/lib/periods";

/**
 * Semana que toca pagar y cuándo. La semana se paga el primer `payDay` desde
 * su último día (ej. semana lunes–domingo, pago el lunes siguiente). Si el día
 * de pago es el último de la semana, se paga ese mismo día.
 * - upcoming: el pago es más adelante (ej. semana de pago de martes a lunes y pago el miércoles)
 * - today: hoy es día de pago
 * - late: ya pasó el día de pago
 */
export type PayDue = { week: Period; payDate: ISODate; status: "upcoming" | "today" | "late" };

export function payDateOf(week: Period, payDay: number): ISODate {
  return addDays(week.to, (payDay - weekdayOf(week.to) + 7) % 7);
}

export function payDue(today: ISODate, payWeekStart: number, payDay: number): PayDue {
  const current = weekRange(today, payWeekStart);
  // Solo la semana en curso si hoy es su último día y también el de pago; si no, la anterior.
  const week = payDateOf(current, payDay) === today ? current : weekRange(addDays(current.from, -1), payWeekStart);
  const payDate = payDateOf(week, payDay);
  return { week, payDate, status: payDate > today ? "upcoming" : payDate === today ? "today" : "late" };
}
