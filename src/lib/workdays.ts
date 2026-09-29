import "server-only";
import type { AttendanceStatus, DayStatus, WorkShift } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { initialStatus } from "@/lib/attendance";
import { CURRENCY, today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, weekdayOf, type ISODate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import type { DaySchedule } from "@/lib/schedule";
import { getSchedule } from "@/lib/schedule-data";
import { getSettings } from "@/lib/settings";

export type DayRow = {
  /** null en la vista previa de días futuros (aún no hay registro) */
  attendanceId: string | null;
  employeeId: string;
  name: string;
  position: string | null;
  status: AttendanceStatus;
  /** Turno (solo días de doble turno y estado Trabajó) */
  shift: WorkShift | null;
  note: string | null;
  /** Pago del día guardado (unidades mínimas); null si aún no se captura */
  dailyPay: number | null;
};

/** Datos del cierre. En días abiertos trae lo capturado antes de una reapertura. */
export type DayClosing = {
  totalSales: number | null;
  tipsTotal: number | null;
  /** Propinas por turno (días de doble turno) */
  tipsMorning: number | null;
  tipsEvening: number | null;
  note: string | null;
  /** ISO de cuándo se cerró; null si está abierto */
  closedAt: string | null;
  shares: { employeeId: string; name: string; amount: number }[];
};

export type DayView = {
  date: ISODate;
  /** dayoff: el restaurante no abre ese día y no hay nada registrado */
  mode: "open" | "closed" | "future" | "dayoff";
  schedule: DaySchedule;
  rows: DayRow[];
  closing: DayClosing | null;
  /** Día de doble turno (mañana y tarde) */
  doubleShift: boolean;
  /** ISO de cuándo se cerró el turno de la mañana; null si sigue abierto */
  morningClosedAt: string | null;
  /** Pago por turno del puesto de cada empleado (Configuración), para sugerirlo al cerrar */
  payRates: Record<string, number>;
  /** Último pago del día de quien no tiene puesto, para sugerirlo al cerrar */
  suggestedPay: Record<string, number>;
};

/** Si un día abre con doble turno según Configuración (días de la semana marcados). */
export async function isDoubleShiftDay(iso: ISODate) {
  return (await getSettings()).doubleShiftWeekdays.includes(weekdayOf(iso));
}

/** Empleados que deben aparecer en la fecha: activos y ya contratados. */
function employedOn(date: Date): Prisma.EmployeeWhereInput {
  return { active: true, OR: [{ hireDate: null }, { hireDate: { lte: date } }] };
}

function timeOffOn(date: Date) {
  return {
    where: { startDate: { lte: date }, endDate: { gte: date } },
    select: { type: true, startDate: true, endDate: true },
  } satisfies Prisma.Employee$timeOffArgs;
}

function toRanges(timeOff: { type: "EXTRA_REST" | "LEAVE"; startDate: Date; endDate: Date }[]) {
  return timeOff.map((t) => ({ type: t.type, startDate: dateToISO(t.startDate), endDate: dateToISO(t.endDate) }));
}

/**
 * Crea el WorkDay (si no existe) y un registro de asistencia por cada empleado
 * que aún no lo tenga, con su estado inicial. Idempotente; no toca días cerrados.
 * Si el restaurante no abre ese día no crea nada y devuelve el WorkDay que ya
 * existiera (o null).
 */
export async function openWorkDay(iso: ISODate, schedule?: DaySchedule) {
  const date = isoToDate(iso);
  const s = schedule ?? (await getSchedule(iso));
  if (!s.open) return db.workDay.findUnique({ where: { date } });

  // Antes de la transacción: con una sola conexión (BD local) la consulta de Configuración se bloquearía.
  const doubleShift = await isDoubleShiftDay(iso);
  return db.$transaction(async (tx) => {
    const day = await tx.workDay.upsert({ where: { date }, update: {}, create: { date, doubleShift } });
    if (day.status === "CLOSED") return day;

    const missing = await tx.employee.findMany({
      where: { ...employedOn(date), attendances: { none: { workDayId: day.id } } },
      select: { id: true, restDays: true, timeOff: timeOffOn(date) },
    });
    if (missing.length) {
      await tx.attendance.createMany({
        data: missing.map((e) => ({
          workDayId: day.id,
          employeeId: e.id,
          status: initialStatus(e.restDays, iso, toRanges(e.timeOff)),
        })),
        skipDuplicates: true,
      });
    }
    return day;
  });
}

type Db = Pick<typeof db, "attendance">;

/**
 * Filas de asistencia que cuentan para el día. Un empleado dado de baja solo
 * sigue apareciendo si ya se le marcó algo ese día.
 */
export async function loadDayRows(client: Db, workDayId: string): Promise<DayRow[]> {
  const attendances = await client.attendance.findMany({
    where: {
      workDayId,
      OR: [{ employee: { active: true } }, { status: { not: "PENDING" } }],
    },
    select: {
      id: true,
      status: true,
      shift: true,
      note: true,
      dailyPay: true,
      employee: { select: { id: true, name: true, jobPosition: { select: { name: true } } } },
    },
    orderBy: { employee: { name: "asc" } },
  });
  return attendances.map((a) => ({
    attendanceId: a.id,
    employeeId: a.employee.id,
    name: a.employee.name,
    position: a.employee.jobPosition?.name ?? null,
    status: a.status,
    shift: a.shift,
    note: a.note,
    dailyPay: fromDecimal(a.dailyPay, CURRENCY.decimals),
  }));
}

/**
 * Para sugerir el pago del día al cerrar: la tarifa del puesto de cada empleado
 * (Configuración; en doble turno se multiplica por los turnos) y, para quien no
 * tiene puesto, el último pago que se le hizo antes de `date`.
 */
async function payHints(employeeIds: string[], date: Date) {
  if (!employeeIds.length) return { payRates: {}, suggestedPay: {} };
  const d = CURRENCY.decimals;
  const [employees, last] = await Promise.all([
    db.employee.findMany({
      where: { id: { in: employeeIds }, jobPosition: { isNot: null } },
      select: { id: true, jobPosition: { select: { dailyPay: true } } },
    }),
    db.attendance.findMany({
      where: { employeeId: { in: employeeIds }, dailyPay: { not: null }, workDay: { date: { lt: date } } },
      orderBy: { workDay: { date: "desc" } },
      distinct: ["employeeId"],
      select: { employeeId: true, dailyPay: true },
    }),
  ]);
  return {
    payRates: Object.fromEntries(employees.map((e) => [e.id, fromDecimal(e.jobPosition!.dailyPay, d)!])),
    suggestedPay: Object.fromEntries(last.map((a) => [a.employeeId, fromDecimal(a.dailyPay, d)!])),
  };
}

export async function getDayView(iso: ISODate): Promise<DayView> {
  const schedule = await getSchedule(iso);
  const dayoff: DayView = {
    date: iso,
    mode: "dayoff",
    schedule,
    rows: [],
    closing: null,
    doubleShift: false,
    morningClosedAt: null,
    payRates: {},
    suggestedPay: {},
  };

  if (iso > today()) {
    if (!schedule.open) return dayoff;
    return { ...dayoff, mode: "future", rows: await previewRows(iso), doubleShift: await isDoubleShiftDay(iso) };
  }

  const opened = await openWorkDay(iso, schedule);
  if (!opened) return dayoff;
  const { id } = opened;
  const [day, rows] = await Promise.all([
    db.workDay.findUniqueOrThrow({
      where: { id },
      include: { tipShares: { include: { employee: { select: { name: true } } } } },
    }),
    loadDayRows(db, id),
  ]);
  const mode = day.status === ("CLOSED" satisfies DayStatus) ? "closed" : "open";
  const hints = mode === "open" ? await payHints(rows.map((r) => r.employeeId), day.date) : { payRates: {}, suggestedPay: {} };

  const d = CURRENCY.decimals;
  return {
    date: iso,
    mode,
    schedule,
    ...hints,
    doubleShift: day.doubleShift,
    morningClosedAt: day.morningClosedAt?.toISOString() ?? null,
    rows,
    closing: {
      totalSales: fromDecimal(day.totalSales, d),
      tipsTotal: fromDecimal(day.tipsTotal, d),
      tipsMorning: fromDecimal(day.tipsMorning, d),
      tipsEvening: fromDecimal(day.tipsEvening, d),
      note: day.note,
      closedAt: day.closedAt?.toISOString() ?? null,
      shares: day.tipShares
        .map((s) => ({ employeeId: s.employeeId, name: s.employee.name, amount: fromDecimal(s.amount, d)! }))
        .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    },
  };
}

/** Días futuros: se calcula cómo arrancará el día, sin guardar nada. */
async function previewRows(iso: ISODate): Promise<DayRow[]> {
  const date = isoToDate(iso);
  const employees = await db.employee.findMany({
    where: employedOn(date),
    select: { id: true, name: true, jobPosition: { select: { name: true } }, restDays: true, timeOff: timeOffOn(date) },
    orderBy: { name: "asc" },
  });
  return employees.map((e) => ({
    attendanceId: null,
    employeeId: e.id,
    name: e.name,
    position: e.jobPosition?.name ?? null,
    status: initialStatus(e.restDays, iso, toRanges(e.timeOff)),
    shift: null,
    note: null,
    dailyPay: null,
  }));
}
