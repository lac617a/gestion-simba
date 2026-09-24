import "server-only";
import { CURRENCY } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import { summarizePayroll, type PayEntry } from "@/lib/payroll";
import type { Period } from "@/lib/periods";
import { countUnclosedDays } from "@/lib/schedule-data";

/**
 * Pagos del periodo (RF-8). Solo cuentan días cerrados: ahí están el pago del
 * día y el reparto de propinas definitivos.
 */
export async function getPayroll(period: Period) {
  const range = { gte: isoToDate(period.from), lte: isoToDate(period.to) };
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
    db.workDay.findMany({ where: { status: "CLOSED", date: range }, select: { date: true } }),
  ]);

  const tipOf = new Map(tips.map((t) => [`${t.workDayId}:${t.employeeId}`, fromDecimal(t.amount, d)!]));
  const entries: PayEntry[] = worked.map((a) => ({
    employeeId: a.employeeId,
    name: a.employee.name,
    date: dateToISO(a.workDay.date),
    dailyPay: fromDecimal(a.dailyPay, d) ?? 0,
    tip: tipOf.get(`${a.workDayId}:${a.employeeId}`) ?? 0,
  }));

  return {
    summary: summarizePayroll(entries),
    unclosedDays: await countUnclosedDays(period, new Set(closedDays.map((w) => dateToISO(w.date)))),
  };
}
