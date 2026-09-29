import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { formatMoney, parseMoney, type Currency } from "@/lib/money";

export type ClosingRow = {
  employeeId: string;
  name: string;
  status: AttendanceStatus;
  /** Turno (solo días de doble turno) */
  shift?: WorkShift | null;
};
export type TipShareCalc = { employeeId: string; name: string; amount: number };

/** Lo que recibe cada uno: "$ 30.000" o, si no es exacto, "$ 50.000 – $ 50.001". */
export function perPersonLabel(amounts: number[], currency: Currency) {
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
}

// ---------- Doble turno ----------

export type ShiftName = "MORNING" | "EVENING";

export const SHIFT_LABEL: Record<WorkShift, string> = { MORNING: "Mañana", EVENING: "Tarde", BOTH: "Ambos" };
export const SHIFT_NAME_LABEL: Record<ShiftName, string> = { MORNING: "mañana", EVENING: "tarde" };

/** Cuántos turnos cuenta: Ambos = 2 (se paga doble), Mañana o Tarde = 1. */
export const shiftCount = (shift: WorkShift | null | undefined) => (shift === "BOTH" ? 2 : shift ? 1 : 0);

/** Trabajó en ese turno (Mañana/Tarde, o Ambos). */
export const inShift = (r: ClosingRow, s: ShiftName) => r.status === "WORKED" && (r.shift === s || r.shift === "BOTH");

/** Quienes trabajaron pero todavía no tienen turno asignado. */
export const missingShift = (rows: ClosingRow[]) => rows.filter((r) => r.status === "WORKED" && !r.shift);

export type ShiftTipShare = TipShareCalc & { morning: number; evening: number };

/**
 * Propinas de un día de doble turno: las de la mañana se reparten entre quienes
 * hicieron la mañana y las de la tarde entre quienes hicieron la tarde (Ambos
 * recibe de los dos). `amount` es la suma por empleado.
 */
export function splitShiftTips(morning: number, evening: number, rows: ClosingRow[]): ShiftTipShare[] {
  const m = new Map(splitTips(morning, rows.filter((r) => inShift(r, "MORNING"))).map((s) => [s.employeeId, s.amount]));
  const e = new Map(splitTips(evening, rows.filter((r) => inShift(r, "EVENING"))).map((s) => [s.employeeId, s.amount]));
  return rows
    .filter((r) => m.has(r.employeeId) || e.has(r.employeeId))
    .sort(byName)
    .map((r) => {
      const mo = m.get(r.employeeId) ?? 0;
      const ev = e.get(r.employeeId) ?? 0;
      return { employeeId: r.employeeId, name: r.name, morning: mo, evening: ev, amount: mo + ev };
    });
}

const names = (rows: ClosingRow[]) => {
  const list = rows.slice(0, 3).map((r) => r.name).join(", ");
  return rows.length > 3 ? `${list} y ${rows.length - 3} más` : list;
};

/** Sin turno asignado o sin nadie para repartir las propinas de un turno. */
function shiftProblems(rows: ClosingRow[], tips: Partial<Record<ShiftName, number>>): string | null {
  const missing = missingShift(rows);
  if (missing.length) return `Falta indicar el turno de ${names(missing)}.`;
  for (const s of ["MORNING", "EVENING"] as const) {
    if ((tips[s] ?? 0) > 0 && !rows.some((r) => inShift(r, s))) {
      return `Nadie hizo el turno de la ${SHIFT_NAME_LABEL[s]}: no se pueden repartir sus propinas.`;
    }
  }
  return null;
}

/**
 * Cierre del turno de la mañana (días de doble turno). Puede haber pendientes
 * (la gente de la tarde aún no llega), pero quien ya está como Trabajó debe
 * tener su turno, para saber con quién se reparten las propinas de la mañana.
 */
export function checkMorningClose(rows: ClosingRow[], tipsMorning: number): { ok: true } | { ok: false; error: string } {
  const problem = shiftProblems(rows, { MORNING: tipsMorning });
  return problem ? { ok: false, error: problem } : { ok: true };
}

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

/**
 * Reglas para poder cerrar el día (PRD RF-3 / RF-4). En días de doble turno se
 * pasan las propinas de cada turno y el reparto es por turno.
 */
export function checkClose(rows: ClosingRow[], tips: number | { morning: number; evening: number }): CloseCheck {
  const pending = rows.filter((r) => r.status === "PENDING").length;
  if (pending > 0) {
    return { ok: false, error: `Falta marcar la asistencia de ${pending} empleado${pending === 1 ? "" : "s"}.` };
  }
  if (typeof tips !== "number") {
    const problem = shiftProblems(rows, { MORNING: tips.morning, EVENING: tips.evening });
    if (problem) return { ok: false, error: problem };
    return { ok: true, shares: splitShiftTips(tips.morning, tips.evening, rows) };
  }
  const tipsTotal = tips;
  const shares = splitTips(tipsTotal, rows);
  if (tipsTotal > 0 && shares.length === 0) {
    return { ok: false, error: "Nadie trabajó este día: no se pueden repartir propinas." };
  }
  return { ok: true, shares };
}
