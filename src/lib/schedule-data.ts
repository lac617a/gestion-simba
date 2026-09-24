import "server-only";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { addDays, dateToISO, isoToDate, type ISODate } from "@/lib/dates";
import { elapsedDays, type Period } from "@/lib/periods";
import { daySchedule, type DaySchedule } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";

/** Si el restaurante abre ese día (regla + excepción manual). */
export async function getSchedule(date: ISODate): Promise<DaySchedule> {
  const [{ closedWeekdays }, override] = await Promise.all([
    getSettings(),
    db.dayOverride.findUnique({ where: { date: isoToDate(date) }, select: { open: true } }),
  ]);
  return daySchedule(date, closedWeekdays, override?.open ?? null);
}

/**
 * Días del periodo que ya pasaron, en que el restaurante abría y todavía no se
 * cerraron (para los avisos de Pagos y Reportes). Los días de cierre no cuentan.
 */
export async function countUnclosedDays(period: Period, closedDates: Set<ISODate>) {
  const days = elapsedDays(period, today());
  if (days === 0) return 0;
  const last = addDays(period.from, days - 1);
  const [{ closedWeekdays }, overrides] = await Promise.all([
    getSettings(),
    db.dayOverride.findMany({
      where: { date: { gte: isoToDate(period.from), lte: isoToDate(last) } },
      select: { date: true, open: true },
    }),
  ]);
  const overrideOf = new Map(overrides.map((o) => [dateToISO(o.date), o.open]));

  let count = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(period.from, i);
    if (closedDates.has(date)) continue;
    if (daySchedule(date, closedWeekdays, overrideOf.get(date) ?? null).open) count++;
  }
  return count;
}
