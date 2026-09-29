import "server-only";
import { CURRENCY } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, type ISODate } from "@/lib/dates";
import { fromDecimal } from "@/lib/money";

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
