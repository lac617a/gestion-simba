import type { AttendanceStatus } from "@/generated/prisma/enums";

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
