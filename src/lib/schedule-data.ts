import "server-only";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { addDays, dateToISO, isoToDate, type ISODate } from "@/lib/dates";
import { elapsedDays, type Period } from "@/lib/periods";
import { daySchedule, type DaySchedule } from "@/lib/schedule";

/** Si el restaurante abre ese día (abre todos los días salvo un cierre marcado a mano). */
export async function getSchedule(date: ISODate): Promise<DaySchedule> {
  const override = await db.dayOverride.findUnique({ where: { date: isoToDate(date) }, select: { open: true } });
  return daySchedule(date, override?.open ?? null);
}

/**
 * Días del periodo que ya pasaron y todavía no se cerraron (para los avisos de
 * Pagos y Reportes). Los días marcados como cerrados no cuentan.
 */
export async function countUnclosedDays(period: Period, closedDates: Set<ISODate>) {
  const days = elapsedDays(period, today());
  if (days === 0) return 0;
  const last = addDays(period.from, days - 1);
  const dayOffs = await db.dayOverride.findMany({
    where: { open: false, date: { gte: isoToDate(period.from), lte: isoToDate(last) } },
    select: { date: true },
  });
  const off = new Set(dayOffs.map((o) => dateToISO(o.date)));

  let count = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(period.from, i);
    if (!closedDates.has(date) && !off.has(date)) count++;
  }
  return count;
}
