import type { ReservationLogAction, ReservationStatus } from "@/generated/prisma/enums";
import { formatDayShort, type ISODate } from "@/lib/dates";
import { formatTime } from "@/lib/hours";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations";

/** Datos de la reserva que se comparan al editarla. */
export const LOGGED_FIELDS = ["date", "time", "partySize", "customerName", "phone", "occasion", "honoree", "note"] as const;
export type LoggedField = (typeof LOGGED_FIELDS)[number];

/** Valores tal como se guardan (fecha "YYYY-MM-DD", hora "HH:MM"). */
export type ReservationSnapshot = { [K in LoggedField]: K extends "partySize" ? number : K extends "date" | "time" | "customerName" ? string : string | null };

export type LogChange =
  | { field: LoggedField; from: string | number | null; to: string | number | null }
  | { field: "status"; from: ReservationStatus; to: ReservationStatus };

const FIELD_LABEL: Record<LoggedField, string> = {
  date: "Fecha",
  time: "Hora",
  partySize: "Personas",
  customerName: "A nombre de",
  phone: "Teléfono",
  occasion: "Ocasión",
  honoree: "Persona de la ocasión",
  note: "Observación",
};

/** Qué cambió entre lo guardado y lo nuevo (vacío = nada). */
export function diffReservation(before: ReservationSnapshot, after: ReservationSnapshot): LogChange[] {
  const norm = (v: string | number | null) => (v === "" ? null : v);
  return LOGGED_FIELDS.filter((f) => norm(before[f]) !== norm(after[f])).map((f) => ({
    field: f,
    from: norm(before[f]),
    to: norm(after[f]),
  }));
}

const truncate = (s: string, max = 80) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function formatValue(field: LoggedField, v: string | number | null) {
  if (v === null) return "(vacío)";
  if (field === "date") return formatDayShort(v as ISODate);
  if (field === "time") return formatTime(String(v));
  return truncate(String(v));
}

export type LogEntry = {
  action: ReservationLogAction;
  changes: LogChange[] | null;
  at: Date;
  /** Quién lo hizo; null si no se sabe */
  user: string | null;
};

/** Frase corta y detalle de un cambio, para mostrar en el historial. */
export function describeLog(e: LogEntry): { title: string; details: string[] } {
  if (e.action === "CREATED") return { title: "Creó la reserva", details: [] };
  if (e.action === "STATUS") {
    const change = e.changes?.find((c) => c.field === "status");
    if (!change) return { title: "Cambió el estado", details: [] };
    const { from, to } = change as { from: ReservationStatus; to: ReservationStatus };
    const title =
      to === "ARRIVED"
        ? "Marcó Llegó"
        : to === "NO_SHOW"
          ? "Marcó No vino"
          : to === "CANCELLED"
            ? "Canceló la reserva"
            : from === "CANCELLED"
              ? "La volvió a confirmar"
              : `Quitó la marca «${RESERVATION_STATUS_LABEL[from]}»`;
    return { title, details: [] };
  }
  const changes = (e.changes ?? []).filter((c): c is Extract<LogChange, { field: LoggedField }> => c.field !== "status");
  return {
    title: "Editó la reserva",
    details: changes.map((c) => `${FIELD_LABEL[c.field]}: ${formatValue(c.field, c.from)} → ${formatValue(c.field, c.to)}`),
  };
}

/**
 * Historial para mostrar, del más reciente al más viejo. Las reservas anteriores
 * al historial no tienen el registro de creación: se arma con sus datos.
 */
export function reservationHistory(logs: LogEntry[], created: { at: Date; user: string | null }): LogEntry[] {
  const all = logs.some((l) => l.action === "CREATED")
    ? logs
    : [...logs, { action: "CREATED" as const, changes: null, at: created.at, user: created.user }];
  return [...all].sort((a, b) => b.at.getTime() - a.at.getTime());
}
