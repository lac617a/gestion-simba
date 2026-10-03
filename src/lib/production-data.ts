import "server-only";
import { CURRENCY } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, type ISODate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";
import type { ProductionLogEntry, ProductionSnapshot } from "@/lib/production-log";
import { displayName } from "@/lib/users";

export type ProductionAttendee = {
  employeeId: string;
  name: string;
  position: string | null;
  /** Pago fijo guardado al registrarlo y excedente (unidades mínimas) */
  basePay: number;
  extraPay: number;
};

export type ProductionDayView = {
  id: string;
  date: ISODate;
  note: string | null;
  attendees: ProductionAttendee[];
};

const select = {
  id: true,
  date: true,
  note: true,
  attendees: {
    select: {
      employeeId: true,
      basePay: true,
      extraPay: true,
      employee: { select: { name: true, jobPosition: { select: { name: true } } } },
    },
    orderBy: { employee: { name: "asc" } },
  },
} as const;

function toView(day: {
  id: string;
  date: Date;
  note: string | null;
  attendees: {
    employeeId: string;
    basePay: { toString(): string };
    extraPay: { toString(): string };
    employee: { name: string; jobPosition: { name: string } | null };
  }[];
}): ProductionDayView {
  const d = CURRENCY.decimals;
  return {
    id: day.id,
    date: dateToISO(day.date),
    note: day.note,
    attendees: day.attendees.map((a) => ({
      employeeId: a.employeeId,
      name: a.employee.name,
      position: a.employee.jobPosition?.name ?? null,
      basePay: fromDecimal(a.basePay, d)!,
      extraPay: fromDecimal(a.extraPay, d)!,
    })),
  };
}

/** Historial de jornadas de producción, de la más reciente hacia atrás (las últimas 100). */
export async function getProductionDays() {
  const days = await db.productionDay.findMany({ select, orderBy: { date: "desc" }, take: 100 });
  return days.map(toView);
}

export async function getProductionDay(id: string) {
  const day = await db.productionDay.findUnique({ where: { id }, select });
  return day && toView(day);
}

const logSelect = {
  id: true,
  productionDayId: true,
  action: true,
  date: true,
  before: true,
  after: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
} as const;

const logOrder = [{ createdAt: "desc" }, { id: "desc" }] as const;

function toLogEntry(l: {
  id: string;
  productionDayId: string | null;
  action: ProductionLogEntry["action"];
  date: Date;
  before: unknown;
  after: unknown;
  createdAt: Date;
  user: { name: string | null; email: string } | null;
}): ProductionLogEntry {
  return {
    id: l.id,
    action: l.action,
    dayId: l.productionDayId,
    date: dateToISO(l.date),
    before: l.before as ProductionSnapshot | null,
    after: l.after as ProductionSnapshot | null,
    at: l.createdAt,
    user: l.user && displayName(l.user),
  };
}

/** Historial de cambios de una jornada, del más reciente al más viejo. */
export async function getProductionLog(dayId: string) {
  const logs = await db.productionLog.findMany({ where: { productionDayId: dayId }, select: logSelect, orderBy: [...logOrder] });
  return logs.map(toLogEntry);
}

/** Últimos cambios de todas las jornadas (también de las eliminadas), del más reciente al más viejo. */
export async function getProductionActivity(limit = 100) {
  const logs = await db.productionLog.findMany({ select: logSelect, orderBy: [...logOrder], take: limit });
  return logs.map(toLogEntry);
}

/** Nombres de los empleados (para el historial); los que no existan no aparecen. */
export async function employeeNames(ids: string[]) {
  const employees = await db.employee.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(employees.map((e) => [e.id, e.name]));
}

/**
 * Empleados que se pueden marcar en una jornada: los activos y, al editar, también
 * quienes ya estaban aunque hoy estén de baja (para no perder el historial).
 */
export async function getProductionCandidates(includeIds: string[] = []) {
  const employees = await db.employee.findMany({
    where: { OR: [{ active: true }, { id: { in: includeIds } }] },
    select: { id: true, name: true, jobPosition: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return employees.map((e) => ({ id: e.id, name: e.name, position: e.jobPosition?.name ?? null }));
}
