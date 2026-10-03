import "server-only";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { dayCounts, employeeDays, moneyByDate, weekSummaries } from "@/lib/employee-history";
import { applyPayments, summarizePayroll } from "@/lib/payroll";
import { getPayData } from "@/lib/payroll-data";
import type { Period } from "@/lib/periods";
import { countUnclosedDays } from "@/lib/schedule-data";

type EmployeeRef = { id: string; hireDate: Date | null; restDays: number[] };

const dateRange = (p: Period) => ({ gte: isoToDate(p.from), lte: isoToDate(p.to) });

/**
 * Una semana de pago del empleado (su ficha): cada día con lo marcado y lo
 * ganado, y lo pagado y por pagar de la semana (lo mismo que cuenta Pagos).
 */
export async function getEmployeeWeek(employee: EmployeeRef, week: Period) {
  const range = dateRange(week);
  const employeeId = employee.id;

  const [attendance, production, timeOff, closedDays, payData] = await Promise.all([
    db.attendance.findMany({
      where: { employeeId, workDay: { date: range } },
      select: { status: true, shift: true, workDay: { select: { date: true, status: true } } },
    }),
    db.productionAttendance.findMany({
      where: { employeeId, productionDay: { date: range } },
      select: { productionDay: { select: { date: true } } },
    }),
    db.timeOff.findMany({
      where: { employeeId, startDate: { lte: range.lte }, endDate: { gte: range.gte } },
      select: { type: true, startDate: true, endDate: true },
    }),
    db.dayOverride.findMany({ where: { open: false, date: range }, select: { date: true } }),
    getPayData(week, employeeId),
  ]);

  const days = employeeDays(week, {
    today: today(),
    hireDate: employee.hireDate && dateToISO(employee.hireDate),
    restDays: employee.restDays,
    timeOff: timeOff.map((t) => ({ type: t.type, startDate: dateToISO(t.startDate), endDate: dateToISO(t.endDate) })),
    attendance: new Map(
      attendance.map((a) => [
        dateToISO(a.workDay.date),
        { status: a.status, shift: a.shift, dayClosed: a.workDay.status === "CLOSED" },
      ])
    ),
    production: new Set(production.map((p) => dateToISO(p.productionDay.date))),
    closedDays: new Set(closedDays.map((c) => dateToISO(c.date))),
  });

  return {
    days,
    counts: dayCounts(days),
    money: moneyByDate(payData.entries),
    /** Ganado, pagado y por pagar de la semana; null si no hay nada que pagar */
    pay: applyPayments(summarizePayroll(payData.entries), payData.records, week).employees[0] ?? null,
    /** Pagos registrados que tocan la semana */
    payments: payData.records,
    unclosedDays: await countUnclosedDays(week, payData.closedDates),
  };
}

/** Resumen de varias semanas (de la más reciente hacia atrás): días, faltas y cómo va el pago. */
export async function getEmployeeWeeks(employee: EmployeeRef, weeks: Period[]) {
  if (weeks.length === 0) return [];
  const range: Period = { from: weeks[weeks.length - 1].from, to: weeks[0].to };
  const [payData, marks] = await Promise.all([
    getPayData(range, employee.id),
    db.attendance.findMany({
      where: { employeeId: employee.id, status: { in: ["WORKED", "ABSENT"] }, workDay: { date: dateRange(range) } },
      select: { status: true, workDay: { select: { date: true } } },
    }),
  ]);
  return weekSummaries(
    weeks,
    payData.entries,
    payData.records,
    marks.map((m) => ({ date: dateToISO(m.workDay.date), status: m.status }))
  );
}
