import { moneyCell, toCsv } from "@/lib/csv";
import type { ISODate } from "@/lib/dates";

/** Un día trabajado (en un día cerrado): lo que se le paga al empleado. */
export type PayEntry = {
  employeeId: string;
  name: string;
  date: ISODate;
  /** Pago del día en unidades mínimas (0 si no se capturó) */
  dailyPay: number;
  tip: number;
};

export type EmployeePayroll = {
  employeeId: string;
  name: string;
  days: number;
  pay: number;
  tips: number;
  total: number;
  entries: PayEntry[];
};

export type PayrollSummary = {
  employees: EmployeePayroll[];
  totals: { days: number; pay: number; tips: number; total: number };
};

/** Agrupa por empleado: días trabajados, pagos diarios + propinas = total a pagar (RF-8). */
export function summarizePayroll(entries: PayEntry[]): PayrollSummary {
  const byEmployee = new Map<string, EmployeePayroll>();
  for (const e of entries) {
    const acc = byEmployee.get(e.employeeId) ?? {
      employeeId: e.employeeId,
      name: e.name,
      days: 0,
      pay: 0,
      tips: 0,
      total: 0,
      entries: [],
    };
    acc.days++;
    acc.pay += e.dailyPay;
    acc.tips += e.tip;
    acc.total += e.dailyPay + e.tip;
    acc.entries.push(e);
    byEmployee.set(e.employeeId, acc);
  }

  const employees = [...byEmployee.values()]
    .map((emp) => ({ ...emp, entries: emp.entries.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  const totals = employees.reduce(
    (t, e) => ({ days: t.days + e.days, pay: t.pay + e.pay, tips: t.tips + e.tips, total: t.total + e.total }),
    { days: 0, pay: 0, tips: 0, total: 0 }
  );
  return { employees, totals };
}

export function payrollCsv(summary: PayrollSummary, from: ISODate, to: ISODate, decimals: number) {
  const m = (minor: number) => moneyCell(minor, decimals);
  return toCsv([
    ["Periodo", `${from} a ${to}`],
    [],
    ["Empleado", "Días trabajados", "Pagos diarios", "Propinas", "Total a pagar"],
    ...summary.employees.map((e) => [e.name, e.days, m(e.pay), m(e.tips), m(e.total)]),
    ["TOTAL", summary.totals.days, m(summary.totals.pay), m(summary.totals.tips), m(summary.totals.total)],
    [],
    ["Detalle"],
    ["Empleado", "Fecha", "Pago del día", "Propina", "Total"],
    ...summary.employees.flatMap((e) =>
      e.entries.map((x) => [e.name, x.date, m(x.dailyPay), m(x.tip), m(x.dailyPay + x.tip)])
    ),
  ]);
}
