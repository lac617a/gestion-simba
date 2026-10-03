import type { ProductionLogAction } from "@/generated/prisma/enums";
import { formatDayShort, type ISODate } from "@/lib/dates";
import { productionTotal } from "@/lib/production";

/** Un asistente como quedó guardado (montos en unidades mínimas). */
export type SnapshotAttendee = { employeeId: string; name: string; basePay: number; extraPay: number };

/** Cómo estaba o cómo quedó una jornada: lo que guarda el historial. */
export type ProductionSnapshot = { date: ISODate; note: string | null; attendees: SnapshotAttendee[] };

export type ProductionLogEntry = {
  id: string;
  action: ProductionLogAction;
  /** Jornada; null si ya se eliminó */
  dayId: string | null;
  /** Fecha de la jornada (la nueva si se cambió) */
  date: ISODate;
  /** Sin "before" al registrarla ni "after" al eliminarla; las registradas antes del historial no tienen ninguno */
  before: ProductionSnapshot | null;
  after: ProductionSnapshot | null;
  at: Date;
  /** Quién lo hizo; null en las registradas antes del historial */
  user: string | null;
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");

/** Lo que se guarda de una jornada: fecha, nota y asistentes (por nombre, sin el puesto). */
export function productionSnapshot(day: { date: ISODate; note: string | null; attendees: SnapshotAttendee[] }): ProductionSnapshot {
  return {
    date: day.date,
    note: day.note || null,
    attendees: day.attendees.map(({ employeeId, name, basePay, extraPay }) => ({ employeeId, name, basePay, extraPay })).sort(byName),
  };
}

export type ProductionChange =
  | { kind: "date"; from: ISODate; to: ISODate }
  | { kind: "added"; attendees: SnapshotAttendee[] }
  | { kind: "removed"; attendees: SnapshotAttendee[] }
  | { kind: "extra"; name: string; from: number; to: number }
  | { kind: "note"; from: string | null; to: string | null };

/** Qué cambió entre lo guardado y lo nuevo (vacío = nada). */
export function diffProduction(before: ProductionSnapshot, after: ProductionSnapshot): ProductionChange[] {
  const changes: ProductionChange[] = [];
  if (before.date !== after.date) changes.push({ kind: "date", from: before.date, to: after.date });

  const prev = new Map(before.attendees.map((a) => [a.employeeId, a]));
  const next = new Set(after.attendees.map((a) => a.employeeId));
  const added = after.attendees.filter((a) => !prev.has(a.employeeId));
  const removed = before.attendees.filter((a) => !next.has(a.employeeId));
  if (added.length) changes.push({ kind: "added", attendees: added });
  if (removed.length) changes.push({ kind: "removed", attendees: removed });
  for (const a of after.attendees) {
    const p = prev.get(a.employeeId);
    if (p && p.extraPay !== a.extraPay) changes.push({ kind: "extra", name: a.name, from: p.extraPay, to: a.extraPay });
  }

  const note = (s: string | null) => s || null;
  if (note(before.note) !== note(after.note)) changes.push({ kind: "note", from: note(before.note), to: note(after.note) });
  return changes;
}

type Money = (minor: number) => string;

const list = new Intl.ListFormat("es", { type: "conjunction" });
const truncate = (s: string, max = 80) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** "Ana, Daniela (+$10.000) y Pedro": el excedente entre paréntesis. */
function people(attendees: SnapshotAttendee[], money: Money) {
  return list.format(attendees.map((a) => (a.extraPay > 0 ? `${a.name} (+${money(a.extraPay)})` : a.name)));
}

/** Quiénes, cuánto y la nota (al registrarla o lo que tenía al eliminarla). */
function summary(s: ProductionSnapshot, money: Money) {
  const n = s.attendees.length;
  const lines = [`${n} ${n === 1 ? "asistente" : "asistentes"}: ${people(s.attendees, money)}`, `Total: ${money(productionTotal(s.attendees))}`];
  if (s.note) lines.push(`Nota: ${truncate(s.note)}`);
  return lines;
}

function changeLine(c: ProductionChange, money: Money) {
  switch (c.kind) {
    case "date":
      return `Fecha: ${formatDayShort(c.from)} → ${formatDayShort(c.to)}`;
    case "added":
      return `Agregó a ${people(c.attendees, money)}`;
    case "removed":
      return `Quitó a ${list.format(c.attendees.map((a) => a.name))}`;
    case "extra":
      return `Excedente de ${c.name}: ${money(c.from)} → ${money(c.to)}`;
    case "note":
      return `Nota: ${c.from ? truncate(c.from) : "(vacía)"} → ${c.to ? truncate(c.to) : "(vacía)"}`;
  }
}

/** Frase corta y detalle de un cambio, para mostrar en el historial. */
export function describeProductionLog(e: ProductionLogEntry, money: Money): { title: string; details: string[] } {
  if (e.action === "CREATED") return { title: "Registró la jornada", details: e.after ? summary(e.after, money) : [] };
  if (e.action === "DELETED") return { title: "Eliminó la jornada", details: e.before ? summary(e.before, money) : [] };
  if (!e.before || !e.after) return { title: "Editó la jornada", details: [] };

  const details = diffProduction(e.before, e.after).map((c) => changeLine(c, money));
  const [from, to] = [productionTotal(e.before.attendees), productionTotal(e.after.attendees)];
  if (from !== to) details.push(`Total: ${money(from)} → ${money(to)}`);
  return { title: "Editó la jornada", details };
}

/** Registrada antes de que existiera el historial: no se sabe quién ni con qué datos. */
export const beforeHistory = (e: ProductionLogEntry) => e.action === "CREATED" && !e.after;
