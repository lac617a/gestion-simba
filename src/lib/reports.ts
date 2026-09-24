import type { AttendanceStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL } from "@/lib/attendance";
import { moneyCell, toCsv } from "@/lib/csv";
import { addDays, daysBetween, type ISODate } from "@/lib/dates";
import type { Period } from "@/lib/periods";

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "es", { sensitivity: "base" });

// ---------- Ventas ----------

/** Un día cerrado, montos en unidades mínimas. */
export type SalesDay = { date: ISODate; totalSales: number; tipsTotal: number; workers: number };

export type SalesSummary = {
  days: SalesDay[];
  totalSales: number;
  tipsTotal: number;
  /** Promedio de venta por día cerrado (redondeado) */
  avgSales: number;
  best: SalesDay | null;
};

export function summarizeSales(days: SalesDay[]): SalesSummary {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const totalSales = sorted.reduce((s, d) => s + d.totalSales, 0);
  const tipsTotal = sorted.reduce((s, d) => s + d.tipsTotal, 0);
  const best = sorted.reduce<SalesDay | null>((b, d) => (!b || d.totalSales > b.totalSales ? d : b), null);
  return {
    days: sorted,
    totalSales,
    tipsTotal,
    avgSales: sorted.length ? Math.round(totalSales / sorted.length) : 0,
    best,
  };
}

/** Una barra del gráfico de ventas: un día, o una semana en rangos largos. */
export type SalesBin = { from: ISODate; to: ISODate; sales: number; tips: number; closedDays: number };

/** Más de estos días en el rango → barras por semana. */
export const MAX_DAILY_BARS = 62;

/**
 * Serie para el gráfico: una barra por cada día del rango (con o sin venta,
 * para que los huecos se vean) o por semana si el rango es largo.
 */
export function salesSeries(days: SalesDay[], from: ISODate, to: ISODate): { unit: "day" | "week"; bins: SalesBin[] } {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const length = daysBetween(from, to) + 1;
  const unit = length > MAX_DAILY_BARS ? "week" : "day";
  const size = unit === "week" ? 7 : 1;
  const bins: SalesBin[] = [];
  for (let start = from; start <= to; start = addDays(start, size)) {
    const end = unit === "week" && addDays(start, 6) < to ? addDays(start, 6) : unit === "week" ? to : start;
    const bin: SalesBin = { from: start, to: end, sales: 0, tips: 0, closedDays: 0 };
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const day = byDate.get(d);
      if (!day) continue;
      bin.sales += day.totalSales;
      bin.tips += day.tipsTotal;
      bin.closedDays++;
    }
    bins.push(bin);
  }
  return { unit, bins };
}

// ---------- Propinas por empleado ----------

export type TipRecord = { employeeId: string; name: string; amount: number };
export type EmployeeTips = { employeeId: string; name: string; total: number; days: number };

export function summarizeTips(records: TipRecord[]) {
  const map = new Map<string, EmployeeTips>();
  for (const r of records) {
    const acc = map.get(r.employeeId) ?? { employeeId: r.employeeId, name: r.name, total: 0, days: 0 };
    acc.total += r.amount;
    if (r.amount > 0) acc.days++;
    map.set(r.employeeId, acc);
  }
  const employees = [...map.values()].sort(byName);
  return { employees, total: employees.reduce((s, e) => s + e.total, 0) };
}

// ---------- Asistencia por empleado ----------

export type AttendanceRecord = { employeeId: string; name: string; status: AttendanceStatus };
export type AttendanceCounts = Record<AttendanceStatus, number>;
export type EmployeeAttendance = { employeeId: string; name: string; counts: AttendanceCounts };

const emptyCounts = (): AttendanceCounts => ({ PENDING: 0, WORKED: 0, REST: 0, EXTRA_REST: 0, ABSENT: 0, LEAVE: 0 });

export function summarizeAttendance(records: AttendanceRecord[]) {
  const map = new Map<string, EmployeeAttendance>();
  const totals = emptyCounts();
  for (const r of records) {
    const acc = map.get(r.employeeId) ?? { employeeId: r.employeeId, name: r.name, counts: emptyCounts() };
    acc.counts[r.status]++;
    totals[r.status]++;
    map.set(r.employeeId, acc);
  }
  return { employees: [...map.values()].sort(byName), totals };
}

/** Columnas del reporte de asistencia, en orden. */
export const ATTENDANCE_COLUMNS = ["WORKED", "REST", "EXTRA_REST", "ABSENT", "LEAVE", "PENDING"] as const;

// ---------- CSV ----------

const periodLine = (p: Period) => ["Periodo", `${p.from} a ${p.to}`];

export function salesCsv(s: SalesSummary, p: Period, decimals: number) {
  const m = (v: number) => moneyCell(v, decimals);
  return toCsv([
    periodLine(p),
    [],
    ["Fecha", "Venta", "Propinas", "Trabajaron"],
    ...s.days.map((d) => [d.date, m(d.totalSales), m(d.tipsTotal), d.workers]),
    ["TOTAL", m(s.totalSales), m(s.tipsTotal), ""],
    ["Promedio por día", m(s.avgSales), "", ""],
  ]);
}

export function tipsCsv(t: ReturnType<typeof summarizeTips>, p: Period, decimals: number) {
  return toCsv([
    periodLine(p),
    [],
    ["Empleado", "Días con propina", "Propinas"],
    ...t.employees.map((e) => [e.name, e.days, moneyCell(e.total, decimals)]),
    ["TOTAL", "", moneyCell(t.total, decimals)],
  ]);
}

export function attendanceCsv(a: ReturnType<typeof summarizeAttendance>, p: Period) {
  return toCsv([
    periodLine(p),
    [],
    ["Empleado", ...ATTENDANCE_COLUMNS.map((s) => STATUS_LABEL[s])],
    ...a.employees.map((e) => [e.name, ...ATTENDANCE_COLUMNS.map((s) => e.counts[s])]),
    ["TOTAL", ...ATTENDANCE_COLUMNS.map((s) => a.totals[s])],
  ]);
}
