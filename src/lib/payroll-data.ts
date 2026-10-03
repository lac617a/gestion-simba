import "server-only";
import { CURRENCY } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import { applyPayments, summarizePayroll, type PayEntry, type PaymentRecord } from "@/lib/payroll";
import type { Period } from "@/lib/periods";
import { countUnclosedDays } from "@/lib/schedule-data";

/**
 * Pagos del periodo (RF-8). Cuentan los días cerrados (ahí están el pago del
 * día y el reparto de propinas definitivos) y las jornadas de producción.
 * Con `employeeId`, solo los de ese empleado (su ficha).
 */
export async function getPayroll(period: Period, employeeId?: string) {
  const range = { gte: isoToDate(period.from), lte: isoToDate(period.to) };
  const d = CURRENCY.decimals;
  const only = employeeId ? { employeeId } : {};

  const [worked, tips, closedDays, payments, production] = await Promise.all([
    db.attendance.findMany({
      where: { ...only, status: "WORKED", workDay: { status: "CLOSED", date: range } },
      select: {
        employeeId: true,
        dailyPay: true,
        workDayId: true,
        workDay: { select: { date: true } },
        employee: { select: { name: true } },
      },
    }),
    db.tipShare.findMany({
      where: { ...only, workDay: { status: "CLOSED", date: range } },
      select: { workDayId: true, employeeId: true, amount: true },
    }),
    db.workDay.findMany({ where: { status: "CLOSED", date: range }, select: { date: true } }),
    // Pagos que tocan el periodo (aunque empiecen antes o terminen después)
    db.payment.findMany({ where: { ...only, periodFrom: { lte: range.lte }, periodTo: { gte: range.gte } } }),
    db.productionAttendance.findMany({
      where: { ...only, productionDay: { date: range } },
      select: {
        employeeId: true,
        basePay: true,
        extraPay: true,
        productionDay: { select: { date: true } },
        employee: { select: { name: true } },
      },
    }),
  ]);

  const tipOf = new Map(tips.map((t) => [`${t.workDayId}:${t.employeeId}`, fromDecimal(t.amount, d)!]));
  const entries: PayEntry[] = worked.map((a) => ({
    employeeId: a.employeeId,
    name: a.employee.name,
    date: dateToISO(a.workDay.date),
    dailyPay: fromDecimal(a.dailyPay, d) ?? 0,
    tip: tipOf.get(`${a.workDayId}:${a.employeeId}`) ?? 0,
  }));
  for (const p of production) {
    entries.push({
      employeeId: p.employeeId,
      name: p.employee.name,
      date: dateToISO(p.productionDay.date),
      dailyPay: 0,
      tip: 0,
      production: (fromDecimal(p.basePay, d) ?? 0) + (fromDecimal(p.extraPay, d) ?? 0),
      kind: "production",
    });
  }

  const records: PaymentRecord[] = payments.map((p) => ({
    id: p.id,
    employeeId: p.employeeId,
    from: dateToISO(p.periodFrom),
    to: dateToISO(p.periodTo),
    amount: fromDecimal(p.amount, d)!,
    paidAt: p.paidAt.toISOString(),
    note: p.note,
  }));

  return {
    summary: applyPayments(summarizePayroll(entries), records, period),
    unclosedDays: await countUnclosedDays(period, new Set(closedDays.map((w) => dateToISO(w.date)))),
  };
}
