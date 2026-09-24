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

// ---------- Pagos realizados ----------

/** Un pago registrado: cubre los días trabajados del empleado entre from y to. */
export type PaymentRecord = {
  id: string;
  employeeId: string;
  from: ISODate;
  to: ISODate;
  /** Monto pagado (unidades mínimas), tal como era al pagar */
  amount: number;
  /** ISO del momento del pago */
  paidAt: string;
  note: string | null;
};

export type PaymentView = PaymentRecord & {
  /**
   * Lo que suman hoy los días de ese rango, o null si el pago se sale del
   * periodo que se está mirando (no se puede comparar completo).
   */
  currentAmount: number | null;
};

export type EmployeePayStatus = EmployeePayroll & {
  /** Suma de los días cubiertos por algún pago */
  paid: number;
  /** Suma de los días sin pagar */
  pending: number;
  pendingDays: number;
  status: "paid" | "partial" | "pending";
  /** Pagos del empleado que tocan el periodo */
  payments: PaymentView[];
  /** Se puede marcar pagado el periodo completo (ningún pago lo toca y hay algo que pagar) */
  canPay: boolean;
};

export type PayrollWithPayments = {
  employees: EmployeePayStatus[];
  totals: PayrollSummary["totals"] & { paid: number; pending: number };
};

const inside = (date: ISODate, p: { from: ISODate; to: ISODate }) => p.from <= date && date <= p.to;

/**
 * Cruza el resumen del periodo con los pagos registrados: qué días ya están
 * pagados, cuánto falta y si algún pago quedó distinto de lo que suman hoy
 * sus días (p. ej. se reabrió un día después de pagar).
 */
export function applyPayments(
  summary: PayrollSummary,
  payments: PaymentRecord[],
  period: { from: ISODate; to: ISODate }
): PayrollWithPayments {
  const employees = summary.employees.map((e): EmployeePayStatus => {
    const own = payments
      .filter((p) => p.employeeId === e.employeeId)
      .sort((a, b) => a.from.localeCompare(b.from));
    let paid = 0;
    let pending = 0;
    let pendingDays = 0;
    for (const x of e.entries) {
      const amount = x.dailyPay + x.tip;
      if (own.some((p) => inside(x.date, p))) paid += amount;
      else {
        pending += amount;
        pendingDays++;
      }
    }
    const views = own.map((p) => ({
      ...p,
      currentAmount:
        p.from >= period.from && p.to <= period.to
          ? e.entries.filter((x) => inside(x.date, p)).reduce((s, x) => s + x.dailyPay + x.tip, 0)
          : null,
    }));
    // "Pagado" es lo que realmente se pagó: si los días cambiaron después de
    // pagar, la diferencia pasa a "pendiente" (o resta, si se pagó de más).
    for (const v of views) {
      if (v.currentAmount === null) continue;
      const diff = v.currentAmount - v.amount;
      paid -= diff;
      pending += diff;
    }
    return {
      ...e,
      paid,
      pending,
      pendingDays,
      status: pendingDays === 0 && pending === 0 ? "paid" : paid > 0 ? "partial" : "pending",
      payments: views,
      canPay: own.length === 0 && e.total > 0,
    };
  });

  return {
    employees,
    totals: {
      ...summary.totals,
      paid: employees.reduce((s, e) => s + e.paid, 0),
      pending: employees.reduce((s, e) => s + e.pending, 0),
    },
  };
}

// ---------- CSV ----------

export function payrollCsv(summary: PayrollWithPayments, from: ISODate, to: ISODate, decimals: number) {
  const m = (minor: number) => moneyCell(minor, decimals);
  const estado = (e: EmployeePayStatus) =>
    e.status === "paid" ? "Pagado" : e.status === "partial" ? "Pagado en parte" : "Pendiente";
  return toCsv([
    ["Periodo", `${from} a ${to}`],
    [],
    ["Empleado", "Días trabajados", "Pagos diarios", "Propinas", "Total", "Pagado", "Pendiente", "Estado"],
    ...summary.employees.map((e) => [e.name, e.days, m(e.pay), m(e.tips), m(e.total), m(e.paid), m(e.pending), estado(e)]),
    [
      "TOTAL",
      summary.totals.days,
      m(summary.totals.pay),
      m(summary.totals.tips),
      m(summary.totals.total),
      m(summary.totals.paid),
      m(summary.totals.pending),
      "",
    ],
    [],
    ["Detalle"],
    ["Empleado", "Fecha", "Pago del día", "Propina", "Total"],
    ...summary.employees.flatMap((e) =>
      e.entries.map((x) => [e.name, x.date, m(x.dailyPay), m(x.tip), m(x.dailyPay + x.tip)])
    ),
  ]);
}
