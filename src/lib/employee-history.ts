import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { initialStatus, type TimeOffRange } from "@/lib/attendance";
import { addDays, type ISODate } from "@/lib/dates";
import { applyPayments, entryTotal, summarizePayroll, type PayEntry, type PaymentRecord } from "@/lib/payroll";
import { shiftPeriod, type Period } from "@/lib/periods";

/** Un día del empleado en su ficha (Historial por semana de pago). */
export type EmployeeDay = {
  date: ISODate;
  /** Lo marcado en la asistencia; en los días que vienen, lo previsto (descanso fijo o día libre asignado); null = nada */
  status: AttendanceStatus | null;
  /** El estado es lo previsto: el día todavía no llega */
  planned: boolean;
  /** Turno, en días de doble turno */
  shift: WorkShift | null;
  /** El día ya se cerró (su pago y propina cuentan) */
  dayClosed: boolean;
  /** El restaurante no abrió (cierre marcado en Asistencia) */
  closedDay: boolean;
  /** Todavía no trabajaba en el restaurante */
  beforeHire: boolean;
  /** Fue a una jornada de producción */
  production: boolean;
  today: boolean;
};

export type DayInput = {
  today: ISODate;
  hireDate: ISODate | null;
  restDays: number[];
  timeOff: TimeOffRange[];
  attendance: Map<ISODate, { status: AttendanceStatus; shift: WorkShift | null; dayClosed: boolean }>;
  production: Set<ISODate>;
  closedDays: Set<ISODate>;
};

function employeeDay(date: ISODate, i: DayInput): EmployeeDay {
  const day: EmployeeDay = {
    date,
    status: null,
    planned: false,
    shift: null,
    dayClosed: false,
    closedDay: false,
    beforeHire: false,
    production: i.production.has(date),
    today: date === i.today,
  };
  if (i.hireDate && date < i.hireDate) return { ...day, beforeHire: true };
  const marked = i.attendance.get(date);
  if (marked) return { ...day, status: marked.status, shift: marked.shift, dayClosed: marked.dayClosed };
  if (i.closedDays.has(date)) return { ...day, closedDay: true };
  if (date > i.today) {
    const expected = initialStatus(i.restDays, date, i.timeOff);
    if (expected !== "PENDING") return { ...day, status: expected, planned: true };
  }
  return day;
}

/** Cada día del periodo (la semana de pago): lo marcado, la producción y, en los que vienen, lo previsto. */
export function employeeDays(period: Period, input: DayInput): EmployeeDay[] {
  const days: EmployeeDay[] = [];
  for (let date = period.from; date <= period.to; date = addDays(date, 1)) days.push(employeeDay(date, input));
  return days;
}

export type DayCounts = {
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

/** Lo que pasó en esos días (sin contar lo previsto de los que vienen). */
export function dayCounts(days: EmployeeDay[]): DayCounts {
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

export type DayMoney = { pay: number; tip: number; production: number; total: number };

/** Lo ganado cada fecha: pago del día + propina (días cerrados) + producción. */
export function moneyByDate(entries: PayEntry[]): Map<ISODate, DayMoney> {
  const byDate = new Map<ISODate, DayMoney>();
  for (const e of entries) {
    const m = byDate.get(e.date) ?? { pay: 0, tip: 0, production: 0, total: 0 };
    byDate.set(e.date, {
      pay: m.pay + e.dailyPay,
      tip: m.tip + e.tip,
      production: m.production + (e.production ?? 0),
      total: m.total + entryTotal(e),
    });
  }
  return byDate;
}

/** `week` y las `count - 1` anteriores (de la más reciente hacia atrás), sin las que terminan antes del ingreso. */
export function recentWeeks(week: Period, count: number, hireDate: ISODate | null): Period[] {
  const weeks: Period[] = [];
  for (let w = week, i = 0; i < count && (!hireDate || w.to >= hireDate); w = shiftPeriod(w, -1), i++) weeks.push(w);
  return weeks;
}

export type WeekSummary = {
  week: Period;
  worked: number;
  absent: number;
  /** Ganado (días cerrados + producción), pagado y por pagar: lo mismo que Pagos para esa semana */
  total: number;
  paid: number;
  pending: number;
  /** none = nada que pagar */
  status: "paid" | "partial" | "pending" | "none";
};

/** Resumen de cada semana: días trabajados, faltas y cómo va el pago. */
export function weekSummaries(
  weeks: Period[],
  entries: PayEntry[],
  payments: PaymentRecord[],
  marks: { date: ISODate; status: AttendanceStatus }[]
): WeekSummary[] {
  return weeks.map((week) => {
    const inWeek = (date: ISODate) => week.from <= date && date <= week.to;
    const pay = applyPayments(summarizePayroll(entries.filter((e) => inWeek(e.date))), payments, week).employees[0];
    const marked = marks.filter((m) => inWeek(m.date));
    return {
      week,
      worked: marked.filter((m) => m.status === "WORKED").length,
      absent: marked.filter((m) => m.status === "ABSENT").length,
      total: pay?.total ?? 0,
      paid: pay?.paid ?? 0,
      pending: pay?.pending ?? 0,
      status: !pay || pay.total === 0 ? "none" : pay.status,
    };
  });
}
