import "server-only";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, type ISOMonth } from "@/lib/dates";
import { employeeCalendar, monthCounts } from "@/lib/employee-history";
import { getPayroll } from "@/lib/payroll-data";
import { monthPeriod } from "@/lib/periods";

/**
 * Historial de un empleado en un mes (su ficha): el calendario con la
 * asistencia, lo ganado, lo pagado y lo que falta (lo mismo que cuenta Pagos).
 */
export async function getEmployeeMonth(
  employee: { id: string; hireDate: Date | null; restDays: number[] },
  month: ISOMonth,
  weekStart: number
) {
  const period = monthPeriod(month);
  const range = { gte: isoToDate(period.from), lte: isoToDate(period.to) };
  const employeeId = employee.id;

  const [attendance, production, timeOff, closedDays, payroll] = await Promise.all([
    db.attendance.findMany({
      where: { employeeId, workDay: { date: range } },
      select: { status: true, shift: true, workDay: { select: { date: true } } },
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
    getPayroll(period, employeeId),
  ]);

  const weeks = employeeCalendar({
    month,
    today: today(),
    weekStart,
    hireDate: employee.hireDate && dateToISO(employee.hireDate),
    restDays: employee.restDays,
    timeOff: timeOff.map((t) => ({ type: t.type, startDate: dateToISO(t.startDate), endDate: dateToISO(t.endDate) })),
    attendance: new Map(attendance.map((a) => [dateToISO(a.workDay.date), { status: a.status, shift: a.shift }])),
    production: new Set(production.map((p) => dateToISO(p.productionDay.date))),
    closedDays: new Set(closedDays.map((c) => dateToISO(c.date))),
  });

  return {
    period,
    weeks,
    counts: monthCounts(weeks),
    /** Lo ganado y pagado en el mes; null si no tiene días pagos ni producción */
    pay: payroll.summary.employees[0] ?? null,
    unclosedDays: payroll.unclosedDays,
  };
}
