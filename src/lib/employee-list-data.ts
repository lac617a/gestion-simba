import "server-only";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, monthOf, type ISODate } from "@/lib/dates";
import { todayStatus, type TodayStatus } from "@/lib/employee-list";
import { monthPeriod } from "@/lib/periods";

export type EmployeeListRow = {
  id: string;
  name: string;
  position: string | null;
  active: boolean;
  restDays: number[];
  /** Cómo está hoy (solo activos) */
  today: TodayStatus | null;
  /** Días trabajados y faltas marcados en lo que va del mes */
  month: { worked: number; absent: number };
};

/**
 * Todos los empleados (activos y dados de baja) con cómo están hoy y su mes
 * hasta hoy. La búsqueda y el filtro por puesto se aplican en la página.
 */
export async function getEmployeeList(): Promise<{ today: ISODate; closedToday: boolean; rows: EmployeeListRow[] }> {
  const t = today();
  const day = isoToDate(t);
  const month = monthPeriod(monthOf(t));

  const [employees, workDay, override, timeOff, counts] = await Promise.all([
    db.employee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true, restDays: true, hireDate: true, jobPosition: { select: { name: true } } },
    }),
    db.workDay.findUnique({ where: { date: day }, select: { attendances: { select: { employeeId: true, status: true } } } }),
    db.dayOverride.findUnique({ where: { date: day }, select: { open: true } }),
    db.timeOff.findMany({
      where: { startDate: { lte: day }, endDate: { gte: day } },
      select: { employeeId: true, type: true, startDate: true, endDate: true },
    }),
    db.attendance.groupBy({
      by: ["employeeId", "status"],
      where: { status: { in: ["WORKED", "ABSENT"] }, workDay: { date: { gte: isoToDate(month.from), lte: isoToDate(month.to) } } },
      _count: { _all: true },
    }),
  ]);

  const closedToday = override?.open === false;
  const marked = new Map(workDay?.attendances.map((a) => [a.employeeId, a.status]));
  const countOf = (employeeId: string, status: "WORKED" | "ABSENT") =>
    counts.find((c) => c.employeeId === employeeId && c.status === status)?._count._all ?? 0;

  return {
    today: t,
    closedToday,
    rows: employees.map((e) => ({
      id: e.id,
      name: e.name,
      position: e.jobPosition?.name ?? null,
      active: e.active,
      restDays: e.restDays,
      today: e.active
        ? todayStatus({
            today: t,
            hireDate: e.hireDate && dateToISO(e.hireDate),
            restDays: e.restDays,
            timeOff: timeOff
              .filter((x) => x.employeeId === e.id)
              .map((x) => ({ type: x.type, startDate: dateToISO(x.startDate), endDate: dateToISO(x.endDate) })),
            marked: marked.get(e.id) ?? null,
            closedToday,
          })
        : null,
      month: { worked: countOf(e.id, "WORKED"), absent: countOf(e.id, "ABSENT") },
    })),
  };
}
