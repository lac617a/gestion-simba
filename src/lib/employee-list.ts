import type { AttendanceStatus } from "@/generated/prisma/enums";
import { initialStatus, searchKey, type TimeOffRange } from "@/lib/attendance";
import type { ISODate } from "@/lib/dates";

/** Cómo está hoy un empleado, para la lista de Empleados. */
export type TodayStatus =
  /** Lo marcado hoy en la asistencia o, si todavía no, lo previsto (descanso fijo, día libre asignado o pendiente). */
  | { kind: "status"; status: AttendanceStatus; /** Último día del permiso o vacaciones, si sigue después de hoy */ until: ISODate | null }
  /** Todavía no ingresa (fecha de ingreso futura) */
  | { kind: "not-hired"; from: ISODate }
  /** El restaurante no abre hoy */
  | { kind: "closed" };

export function todayStatus(input: {
  today: ISODate;
  hireDate: ISODate | null;
  restDays: number[];
  /** Días libres asignados del empleado */
  timeOff: TimeOffRange[];
  /** Estado marcado hoy (null si el día no se ha abierto) */
  marked: AttendanceStatus | null;
  closedToday: boolean;
}): TodayStatus {
  const { today } = input;
  if (input.closedToday) return { kind: "closed" };
  if (input.hireDate && input.hireDate > today) return { kind: "not-hired", from: input.hireDate };
  const status = input.marked ?? initialStatus(input.restDays, today, input.timeOff);
  const type = status === "LEAVE" || status === "EXTRA_REST" ? status : null;
  const range = type && input.timeOff.find((t) => t.type === type && t.startDate <= today && today <= t.endDate);
  return { kind: "status", status, until: range && range.endDate > today ? range.endDate : null };
}

/** Texto corto de cómo está hoy ("Trabaja hoy", "Vacaciones hasta el 22 de oct"…); null si no aplica. */
export function todayLabel(s: TodayStatus, formatDate: (iso: ISODate) => string): string | null {
  if (s.kind === "closed") return null;
  if (s.kind === "not-hired") return `Ingresa el ${formatDate(s.from)}`;
  const until = s.until && ` hasta el ${formatDate(s.until)}`;
  switch (s.status) {
    case "WORKED":
      return "Trabaja hoy";
    case "PENDING":
      return "Sin marcar hoy";
    case "REST":
      return "Descansa hoy";
    case "ABSENT":
      return "Faltó hoy";
    case "EXTRA_REST":
      return until ? `Permiso${until}` : "Permiso hoy";
    case "LEAVE":
      return until ? `Vacaciones${until}` : "Vacaciones hoy";
  }
}

export const NO_POSITION = "Sin puesto";

/** Puesto para la dirección: "Jefe de mesa" → "jefe-de-mesa". */
export const positionSlug = (name: string) =>
  searchKey(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Agrupa por puesto en orden alfabético, "Sin puesto" al final (igual que Asistencia). */
export function groupByPosition<T extends { position: string | null }>(rows: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const g = r.position ?? NO_POSITION;
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }
  return [...groups.entries()].sort(
    ([a], [b]) => Number(a === NO_POSITION) - Number(b === NO_POSITION) || a.localeCompare(b, "es")
  );
}
