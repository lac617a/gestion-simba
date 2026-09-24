import type { AttendanceStatus } from "@/generated/prisma/enums";
import { parseMoney } from "@/lib/money";

export type ClosingRow = { employeeId: string; name: string; status: AttendanceStatus };
export type TipShareCalc = { employeeId: string; name: string; amount: number };

const byName = (a: { name: string; employeeId: string }, b: { name: string; employeeId: string }) =>
  a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.employeeId.localeCompare(b.employeeId);

/**
 * Reparte `total` (unidades mínimas) en partes iguales entre quienes trabajaron.
 * Lo que sobra de la división se da de 1 en 1 por orden alfabético, así la suma cuadra exacta.
 */
export function splitTips(total: number, rows: ClosingRow[]): TipShareCalc[] {
  const workers = rows.filter((r) => r.status === "WORKED").sort(byName);
  if (workers.length === 0) return [];
  const base = Math.floor(total / workers.length);
  const remainder = total - base * workers.length;
  return workers.map((w, i) => ({
    employeeId: w.employeeId,
    name: w.name,
    amount: base + (i < remainder ? 1 : 0),
  }));
}

/** Nombre del campo del formulario con el pago del día de un empleado. */
export const payField = (employeeId: string) => `pay_${employeeId}`;

export type PaysResult =
  | { ok: true; pays: Map<string, number> }
  | { ok: false; errors: Record<string, string> };

/**
 * Lee el pago del día de cada empleado que trabajó (RF-7). Es obligatorio
 * (puede ser 0); los demás estados no se pagan.
 */
export function parsePays(rows: ClosingRow[], raw: (field: string) => string, decimals: number): PaysResult {
  const pays = new Map<string, number>();
  const errors: Record<string, string> = {};
  for (const r of rows) {
    if (r.status !== "WORKED") continue;
    const value = raw(payField(r.employeeId)).trim();
    const minor = value === "" ? null : parseMoney(value, decimals);
    if (value === "") errors[r.employeeId] = "Escribe el pago del día";
    else if (minor === null) errors[r.employeeId] = "Monto inválido";
    else pays.set(r.employeeId, minor);
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, pays };
}

export type CloseCheck =
  | { ok: true; shares: TipShareCalc[] }
  | { ok: false; error: string };

/** Reglas para poder cerrar el día (PRD RF-3 / RF-4). */
export function checkClose(rows: ClosingRow[], tipsTotal: number): CloseCheck {
  const pending = rows.filter((r) => r.status === "PENDING").length;
  if (pending > 0) {
    return { ok: false, error: `Falta marcar la asistencia de ${pending} empleado${pending === 1 ? "" : "s"}.` };
  }
  const shares = splitTips(tipsTotal, rows);
  if (tipsTotal > 0 && shares.length === 0) {
    return { ok: false, error: "Nadie trabajó este día: no se pueden repartir propinas." };
  }
  return { ok: true, shares };
}
