import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { initialStatus, type TimeOffRange } from "@/lib/attendance";
import { addDays, weekdayOf, type ISODate, type ISOMonth } from "@/lib/dates";
import { monthPeriod } from "@/lib/periods";

/** Un día del calendario del empleado (ficha → Historial). */
export type CalendarDay = {
  date: ISODate;
  /** Lo marcado en la asistencia; en los días que vienen, lo previsto (descanso fijo o día libre asignado); null = nada */
  status: AttendanceStatus | null;
  /** El estado es lo previsto: el día todavía no llega */
  planned: boolean;
  /** Turno, en días de doble turno */
  shift: WorkShift | null;
  /** El restaurante no abrió (cierre marcado en Asistencia) */
  closedDay: boolean;
  /** Todavía no trabajaba en el restaurante */
  beforeHire: boolean;
  /** Fue a una jornada de producción */
  production: boolean;
  today: boolean;
};

export type CalendarInput = {
  month: ISOMonth;
  today: ISODate;
  /** Primer día de cada fila: el de la semana de pago (0 = domingo … 6 = sábado) */
  weekStart: number;
  hireDate: ISODate | null;
  restDays: number[];
  timeOff: TimeOffRange[];
  attendance: Map<ISODate, { status: AttendanceStatus; shift: WorkShift | null }>;
  production: Set<ISODate>;
  closedDays: Set<ISODate>;
};

function calendarDay(date: ISODate, i: CalendarInput): CalendarDay {
  const day: CalendarDay = {
    date,
    status: null,
    planned: false,
    shift: null,
    closedDay: false,
    beforeHire: false,
    production: i.production.has(date),
    today: date === i.today,
  };
  if (i.hireDate && date < i.hireDate) return { ...day, beforeHire: true };
  const marked = i.attendance.get(date);
  if (marked) return { ...day, status: marked.status, shift: marked.shift };
  if (i.closedDays.has(date)) return { ...day, closedDay: true };
  if (date > i.today) {
    const expected = initialStatus(i.restDays, date, i.timeOff);
    if (expected !== "PENDING") return { ...day, status: expected, planned: true };
  }
  return day;
}

/**
 * Calendario del mes por semanas (filas de 7, desde `weekStart`): cada día con
 * lo marcado en la asistencia, la producción y, en los que vienen, lo previsto.
 * Los huecos antes del 1 y después del último día son null.
 */
export function employeeCalendar(input: CalendarInput): (CalendarDay | null)[][] {
  const { from, to } = monthPeriod(input.month);
  const cells: (CalendarDay | null)[] = Array((weekdayOf(from) - input.weekStart + 7) % 7).fill(null);
  for (let date = from; date <= to; date = addDays(date, 1)) cells.push(calendarDay(date, input));
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export type MonthCounts = {
  worked: number;
  /** De los días trabajados, cuántos con los dos turnos */
  doubleShifts: number;
  absent: number;
  rest: number;
  extraRest: number;
  leave: number;
  /** Días que se abrieron y quedaron sin marcar */
  unmarked: number;
  production: number;
};

/** Lo que pasó en el mes (sin contar lo previsto de los días que vienen). */
export function monthCounts(weeks: (CalendarDay | null)[][]): MonthCounts {
  const days = weeks.flat().filter((d): d is CalendarDay => d !== null);
  const marked = days.filter((d) => d.status && !d.planned);
  const count = (s: AttendanceStatus) => marked.filter((d) => d.status === s).length;
  return {
    worked: count("WORKED"),
    doubleShifts: marked.filter((d) => d.status === "WORKED" && d.shift === "BOTH").length,
    absent: count("ABSENT"),
    rest: count("REST"),
    extraRest: count("EXTRA_REST"),
    leave: count("LEAVE"),
    unmarked: count("PENDING"),
    production: days.filter((d) => d.production).length,
  };
}
