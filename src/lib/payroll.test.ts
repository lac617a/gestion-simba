import { describe, expect, it } from "vitest";
import { parsePays, payField, type ClosingRow } from "./closing";
import { applyPayments, payrollCsv, summarizePayroll, type PayEntry, type PaymentRecord } from "./payroll";

describe("parsePays", () => {
  const rows: ClosingRow[] = [
    { employeeId: "a", name: "Ana", status: "WORKED" },
    { employeeId: "b", name: "Bruno", status: "WORKED" },
    { employeeId: "c", name: "Carla", status: "REST" },
  ];
  const form = (values: Record<string, string>) => (field: string) => values[field] ?? "";

  it("lee el pago de quienes trabajaron e ignora a los demás", () => {
    const r = parsePays(rows, form({ [payField("a")]: "70.000", [payField("b")]: "0", [payField("c")]: "99" }), 0);
    expect(r.ok && [...r.pays]).toEqual([
      ["a", 70_000],
      ["b", 0],
    ]);
  });

  it("exige el pago de cada uno que trabajó y valida el monto", () => {
    const r = parsePays(rows, form({ [payField("a")]: "abc" }), 0);
    expect(r).toEqual({ ok: false, errors: { a: "Monto inválido", b: "Escribe el pago del día" } });
  });
});

describe("summarizePayroll", () => {
  const e = (name: string, date: string, dailyPay: number, tip: number): PayEntry => ({
    employeeId: `id-${name}`,
    name,
    date,
    dailyPay,
    tip,
  });

  it("suma días, pagos, propinas y total por empleado", () => {
    const s = summarizePayroll([
      e("Bruno", "2026-09-22", 80_000, 30_000),
      e("Ana", "2026-09-23", 70_000, 25_000),
      e("Ana", "2026-09-21", 80_000, 40_000),
    ]);
    expect(s.employees.map((x) => [x.name, x.days, x.pay, x.tips, x.total])).toEqual([
      ["Ana", 2, 150_000, 65_000, 215_000],
      ["Bruno", 1, 80_000, 30_000, 110_000],
    ]);
    expect(s.employees[0].entries.map((x) => x.date)).toEqual(["2026-09-21", "2026-09-23"]);
    expect(s.totals).toEqual({ days: 3, pay: 230_000, tips: 95_000, total: 325_000 });
  });

  it("sin datos → vacío", () => {
    expect(summarizePayroll([])).toEqual({ employees: [], totals: { days: 0, pay: 0, tips: 0, total: 0 } });
  });
});

describe("applyPayments", () => {
  const week = { from: "2026-09-21", to: "2026-09-27" };
  const month = { from: "2026-09-01", to: "2026-09-30" };
  const e = (id: string, date: string, dailyPay: number, tip: number): PayEntry => ({
    employeeId: id,
    name: id === "a" ? "Ana" : "Bruno",
    date,
    dailyPay,
    tip,
  });
  const entries = [
    e("a", "2026-09-15", 70_000, 20_000), // semana anterior
    e("a", "2026-09-22", 70_000, 30_000),
    e("a", "2026-09-23", 80_000, 40_000),
    e("b", "2026-09-22", 80_000, 30_000),
  ];
  const pay = (employeeId: string, from: string, to: string, amount: number): PaymentRecord => ({
    id: `${employeeId}-${from}`,
    employeeId,
    from,
    to,
    amount,
    paidAt: "2026-09-27T20:00:00.000Z",
    note: null,
  });

  it("sin pagos: todo pendiente y se puede pagar", () => {
    const r = applyPayments(summarizePayroll(entries.slice(1)), [], week);
    expect(r.employees.map((x) => [x.name, x.status, x.pending, x.canPay])).toEqual([
      ["Ana", "pending", 220_000, true],
      ["Bruno", "pending", 110_000, true],
    ]);
    expect(r.totals).toMatchObject({ total: 330_000, paid: 0, pending: 330_000 });
  });

  it("pago de la semana: pagado, sin diferencia, ya no se puede volver a pagar", () => {
    const r = applyPayments(summarizePayroll(entries.slice(1)), [pay("a", week.from, week.to, 220_000)], week);
    const ana = r.employees[0];
    expect(ana).toMatchObject({ status: "paid", paid: 220_000, pending: 0, canPay: false });
    expect(ana.payments[0].currentAmount).toBe(220_000);
    expect(r.totals).toMatchObject({ paid: 220_000, pending: 110_000 });
  });

  it("vista del mes con una semana pagada: pagado en parte", () => {
    const r = applyPayments(summarizePayroll(entries), [pay("a", week.from, week.to, 220_000)], month);
    expect(r.employees[0]).toMatchObject({ status: "partial", paid: 220_000, pending: 90_000, pendingDays: 1, canPay: false });
  });

  it("si los días cambiaron después de pagar, la diferencia queda por pagar", () => {
    const r = applyPayments(summarizePayroll(entries.slice(1)), [pay("a", week.from, week.to, 200_000)], week);
    expect(r.employees[0].payments[0]).toMatchObject({ amount: 200_000, currentAmount: 220_000 });
    expect(r.employees[0]).toMatchObject({ status: "partial", paid: 200_000, pending: 20_000, pendingDays: 0 });
    expect(r.totals).toMatchObject({ paid: 200_000, pending: 130_000 });
  });

  it("si se pagó de más, el pendiente queda negativo", () => {
    const r = applyPayments(summarizePayroll(entries.slice(1)), [pay("a", week.from, week.to, 230_000)], week);
    expect(r.employees[0]).toMatchObject({ paid: 230_000, pending: -10_000 });
  });

  it("un pago que se sale del periodo visto no se compara (currentAmount null)", () => {
    const r = applyPayments(summarizePayroll(entries.slice(1)), [pay("a", "2026-09-16", "2026-09-30", 999)], week);
    expect(r.employees[0].payments[0].currentAmount).toBeNull();
    expect(r.employees[0].status).toBe("paid");
  });
});

describe("payrollCsv", () => {
  const view = (entries: PayEntry[]) => applyPayments(summarizePayroll(entries), [], { from: "2026-09-21", to: "2026-09-27" });

  it("genera CSV con ; y BOM, con escape de comillas y estado", () => {
    const csv = payrollCsv(
      view([{ employeeId: "a", name: 'Ana "La jefa"', date: "2026-09-21", dailyPay: 70_000, tip: 25_000 }]),
      "2026-09-21",
      "2026-09-27",
      0
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Ana ""La jefa""";1;70000;25000;95000;0;95000;Pendiente');
    expect(csv).toContain("TOTAL;1;70000;25000;95000;0;95000;");
  });

  it("con centavos usa coma decimal", () => {
    const csv = payrollCsv(view([{ employeeId: "a", name: "Ana", date: "2026-09-21", dailyPay: 12_550, tip: 0 }]), "2026-09-21", "2026-09-27", 2);
    expect(csv).toContain("Ana;1;125,50;0,00;125,50;0,00;125,50;Pendiente");
  });
});
