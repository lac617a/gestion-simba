import "server-only";
import { CURRENCY, PAY_WEEK_START, today } from "@/lib/config";
import { db } from "@/lib/db";
import { addDays, daysBetween, dateToISO, isISODate, isoToDate, type ISODate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import { summarizePayroll, weekRange, type PayEntry } from "@/lib/payroll";

const MAX_RANGE_DAYS = 366;

/** Periodo pedido por URL (?desde&hasta) o, si no hay, la semana de pago actual. */
export function resolvePeriod(desde: unknown, hasta: unknown): { from: ISODate; to: ISODate } {
  if (isISODate(desde) && isISODate(hasta)) {
    const [from, to] = desde <= hasta ? [desde, hasta] : [hasta, desde];
    return { from, to: daysBetween(from, to) > MAX_RANGE_DAYS ? addDays(from, MAX_RANGE_DAYS) : to };
  }
  return weekRange(today(), PAY_WEEK_START);
}

/**
 * Pagos del periodo (RF-8). Solo cuentan días cerrados: ahí están el pago del
 * día y el reparto de propinas definitivos.
 */
export async function getPayroll(from: ISODate, to: ISODate) {
  const range = { gte: isoToDate(from), lte: isoToDate(to) };
  const d = CURRENCY.decimals;

  const [worked, tips, closedDays] = await Promise.all([
    db.attendance.findMany({
      where: { status: "WORKED", workDay: { status: "CLOSED", date: range } },
      select: {
        employeeId: true,
        dailyPay: true,
        workDayId: true,
        workDay: { select: { date: true } },
        employee: { select: { name: true } },
      },
    }),
    db.tipShare.findMany({
      where: { workDay: { status: "CLOSED", date: range } },
      select: { workDayId: true, employeeId: true, amount: true },
    }),
    db.workDay.count({ where: { status: "CLOSED", date: range } }),
  ]);

  const tipOf = new Map(tips.map((t) => [`${t.workDayId}:${t.employeeId}`, fromDecimal(t.amount, d)!]));
  const entries: PayEntry[] = worked.map((a) => ({
    employeeId: a.employeeId,
    name: a.employee.name,
    date: dateToISO(a.workDay.date),
    dailyPay: fromDecimal(a.dailyPay, d) ?? 0,
    tip: tipOf.get(`${a.workDayId}:${a.employeeId}`) ?? 0,
  }));

  // Días del periodo que ya pasaron (hasta hoy) y aún no están cerrados.
  const lastElapsed = to < today() ? to : today();
  const elapsedDays = lastElapsed < from ? 0 : daysBetween(from, lastElapsed) + 1;

  return { summary: summarizePayroll(entries), unclosedDays: Math.max(0, elapsedDays - closedDays) };
}
