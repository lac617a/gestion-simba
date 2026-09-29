import "server-only";
import type { AttendanceStatus, DayStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { initialStatus } from "@/lib/attendance";
import { CURRENCY, today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, type ISODate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import type { DaySchedule } from "@/lib/schedule";
import { getSchedule } from "@/lib/schedule-data";

export type DayRow = {
  /** null en la vista previa de días futuros (aún no hay registro) */
  attendanceId: string | null;
  employeeId: string;
  name: string;
  position: string | null;
  status: AttendanceStatus;
  note: string | null;
  /** Pago del día guardado (unidades mínimas); null si aún no se captura */
  dailyPay: number | null;
};

/** Datos del cierre. En días abiertos trae lo capturado antes de una reapertura. */
export type DayClosing = {
  totalSales: number | null;
  tipsTotal: number | null;
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
  /** Último pago del día registrado por empleado, para sugerirlo al cerrar */
  suggestedPay: Record<string, number>;
};

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

  return db.$transaction(async (tx) => {
    const day = await tx.workDay.upsert({ where: { date }, update: {}, create: { date } });
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
    note: a.note,
    dailyPay: fromDecimal(a.dailyPay, CURRENCY.decimals),
  }));
}

/**
 * Pago del día sugerido al cerrar: el del puesto del empleado (Configuración).
 * Si no tiene puesto, el último que se le pagó antes de `date`.
 */
async function suggestedPays(employeeIds: string[], date: Date): Promise<Record<string, number>> {
  if (!employeeIds.length) return {};
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
    ...Object.fromEntries(last.map((a) => [a.employeeId, fromDecimal(a.dailyPay, d)!])),
    ...Object.fromEntries(employees.map((e) => [e.id, fromDecimal(e.jobPosition!.dailyPay, d)!])),
  };
}

export async function getDayView(iso: ISODate): Promise<DayView> {
  const schedule = await getSchedule(iso);
  const dayoff: DayView = { date: iso, mode: "dayoff", schedule, rows: [], closing: null, suggestedPay: {} };

  if (iso > today()) {
    if (!schedule.open) return dayoff;
    return { ...dayoff, mode: "future", rows: await previewRows(iso) };
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
  const suggestedPay = mode === "open" ? await suggestedPays(rows.map((r) => r.employeeId), day.date) : {};

  const d = CURRENCY.decimals;
  return {
    date: iso,
    mode,
    schedule,
    suggestedPay,
    rows,
    closing: {
      totalSales: fromDecimal(day.totalSales, d),
      tipsTotal: fromDecimal(day.tipsTotal, d),
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
    note: null,
    dailyPay: null,
  }));
}
