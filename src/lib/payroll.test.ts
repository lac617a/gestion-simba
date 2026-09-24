import { describe, expect, it } from "vitest";
import { parsePays, payField, type ClosingRow } from "./closing";
import { payrollCsv, summarizePayroll, weekRange, type PayEntry } from "./payroll";

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

describe("weekRange", () => {
  it("semana de lunes a domingo", () => {
    expect(weekRange("2026-09-23", 1)).toEqual({ from: "2026-09-21", to: "2026-09-27" }); // miércoles
    expect(weekRange("2026-09-21", 1)).toEqual({ from: "2026-09-21", to: "2026-09-27" }); // lunes
    expect(weekRange("2026-09-27", 1)).toEqual({ from: "2026-09-21", to: "2026-09-27" }); // domingo
  });

  it("semana con otro día de inicio (miércoles)", () => {
    expect(weekRange("2026-09-22", 3)).toEqual({ from: "2026-09-16", to: "2026-09-22" }); // martes
    expect(weekRange("2026-09-23", 3)).toEqual({ from: "2026-09-23", to: "2026-09-29" });
  });
});

describe("payrollCsv", () => {
  it("genera CSV con ; y BOM, con escape de comillas", () => {
    const s = summarizePayroll([
      { employeeId: "a", name: 'Ana "La jefa"', date: "2026-09-21", dailyPay: 70_000, tip: 25_000 },
    ]);
    const csv = payrollCsv(s, "2026-09-21", "2026-09-27", 0);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Ana ""La jefa""";1;70000;25000;95000');
    expect(csv).toContain("TOTAL;1;70000;25000;95000");
  });

  it("con centavos usa coma decimal", () => {
    const s = summarizePayroll([{ employeeId: "a", name: "Ana", date: "2026-09-21", dailyPay: 12_550, tip: 0 }]);
    expect(payrollCsv(s, "2026-09-21", "2026-09-27", 2)).toContain("Ana;1;125,50;0,00;125,50");
  });
});
