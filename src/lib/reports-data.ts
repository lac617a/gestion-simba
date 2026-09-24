import "server-only";
import { CURRENCY } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import type { Period } from "@/lib/periods";
import { countUnclosedDays } from "@/lib/schedule-data";
import { summarizeAttendance, summarizeSales, summarizeTips } from "@/lib/reports";

/**
 * Datos de los reportes (RF-5). Ventas y propinas salen de días cerrados;
 * la asistencia, de todos los días ya abiertos del periodo.
 */
export async function getReports(period: Period) {
  const range = { gte: isoToDate(period.from), lte: isoToDate(period.to) };
  const d = CURRENCY.decimals;

  const [closedDays, tipShares, attendances] = await Promise.all([
    db.workDay.findMany({
      where: { status: "CLOSED", date: range },
      select: {
        date: true,
        totalSales: true,
        tipsTotal: true,
        _count: { select: { attendances: { where: { status: "WORKED" } } } },
      },
    }),
    db.tipShare.findMany({
      where: { workDay: { status: "CLOSED", date: range } },
      select: { amount: true, employee: { select: { id: true, name: true } } },
    }),
    db.attendance.findMany({
      where: {
        workDay: { date: range },
        // Igual que en la pantalla del día: un empleado de baja solo cuenta si se le marcó algo.
        OR: [{ employee: { active: true } }, { status: { not: "PENDING" } }],
      },
      select: { status: true, employee: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    sales: summarizeSales(
      closedDays.map((w) => ({
        date: dateToISO(w.date),
        totalSales: fromDecimal(w.totalSales, d) ?? 0,
        tipsTotal: fromDecimal(w.tipsTotal, d) ?? 0,
        workers: w._count.attendances,
      }))
    ),
    tips: summarizeTips(
      tipShares.map((t) => ({ employeeId: t.employee.id, name: t.employee.name, amount: fromDecimal(t.amount, d)! }))
    ),
    attendance: summarizeAttendance(
      attendances.map((a) => ({ employeeId: a.employee.id, name: a.employee.name, status: a.status }))
    ),
    unclosedDays: await countUnclosedDays(period, new Set(closedDays.map((w) => dateToISO(w.date)))),
  };
}
