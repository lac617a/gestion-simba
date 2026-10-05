import "server-only";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, type ISODate } from "@/lib/dates";
import { todayStatus, weekCounts, type TodayStatus, type WeekCount } from "@/lib/employee-list";
import { shiftPeriod, weekRange, type Period } from "@/lib/periods";
import { getSettings } from "@/lib/settings";

export type EmployeeListRow = {
  id: string;
  name: string;
  position: string | null;
  active: boolean;
  restDays: number[];
  /** Cómo está hoy (solo activos) */
  today: TodayStatus | null;
  /** Días trabajados y faltas de la semana de pago pasada y de la actual */
  weeks: { previous: WeekCount; current: WeekCount };
};

const NO_DAYS: WeekCount = { worked: 0, absent: 0 };

/**
 * Todos los empleados (activos y dados de baja) con cómo están hoy y sus días
 * de la semana de pago pasada y de la actual (el pago es por semana). La
 * búsqueda y el filtro por puesto se aplican en la página.
 */
export async function getEmployeeList(): Promise<{
  today: ISODate;
  closedToday: boolean;
  weeks: { previous: Period; current: Period };
  rows: EmployeeListRow[];
}> {
  const t = today();
  const day = isoToDate(t);
  const current = weekRange(t, (await getSettings()).payWeekStart);
  const previous = shiftPeriod(current, -1);

  const [employees, workDay, override, timeOff, marks] = await Promise.all([
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
    db.attendance.findMany({
      where: {
        status: { in: ["WORKED", "ABSENT"] },
        workDay: { date: { gte: isoToDate(previous.from), lte: isoToDate(current.to) } },
      },
      select: { employeeId: true, status: true, workDay: { select: { date: true } } },
    }),
  ]);

  const closedToday = override?.open === false;
  const marked = new Map(workDay?.attendances.map((a) => [a.employeeId, a.status]));
  const byDate = marks.map((m) => ({ employeeId: m.employeeId, status: m.status, date: dateToISO(m.workDay.date) }));
  const previousCounts = weekCounts(byDate, previous);
  const currentCounts = weekCounts(byDate, current);

  return {
    today: t,
    closedToday,
    weeks: { previous, current },
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
      weeks: { previous: previousCounts.get(e.id) ?? NO_DAYS, current: currentCounts.get(e.id) ?? NO_DAYS },
    })),
  };
}
