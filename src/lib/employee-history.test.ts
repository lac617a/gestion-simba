import { describe, expect, it } from "vitest";
import { dayCounts, employeeDays, moneyByDate, recentWeeks, weekSummaries, type DayInput } from "./employee-history";
import type { PayEntry, PaymentRecord } from "./payroll";

// Semana de pago de lunes a domingo que cruza de septiembre a octubre de 2026
const week = { from: "2026-09-28", to: "2026-10-04" };

const base: DayInput = {
  today: "2026-10-03",
  hireDate: null,
  restDays: [],
  timeOff: [],
  attendance: new Map(),
  production: new Set(),
  closedDays: new Set(),
};

const work = (date: string, dailyPay: number, tip: number): PayEntry => ({ employeeId: "e", name: "Ana", date, dailyPay, tip });
const prod = (date: string, production: number): PayEntry => ({
  employeeId: "e",
  name: "Ana",
  date,
  dailyPay: 0,
  tip: 0,
  production,
  kind: "production",
});

describe("semana del empleado", () => {
  it("los 7 días de la semana de pago, aunque crucen de mes", () => {
    const days = employeeDays(week, base);
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("lo marcado (y si el día ya se cerró), la producción, los cierres, antes de ingresar y lo previsto", () => {
    const days = employeeDays(week, {
      ...base,
      hireDate: "2026-09-29",
      restDays: [0], // domingo
      attendance: new Map([
        ["2026-09-30", { status: "WORKED", shift: "BOTH", dayClosed: true }],
        ["2026-10-01", { status: "ABSENT", shift: null, dayClosed: true }],
        ["2026-10-03", { status: "WORKED", shift: null, dayClosed: false }],
      ]),
      production: new Set(["2026-10-02"]),
      closedDays: new Set(["2026-10-02"]),
    });
    const day = (date: string) => days.find((d) => d.date === date)!;

    expect(day("2026-09-28")).toMatchObject({ beforeHire: true, status: null });
    expect(day("2026-09-29")).toMatchObject({ status: null, planned: false }); // pasado sin asistencia
    expect(day("2026-09-30")).toMatchObject({ status: "WORKED", shift: "BOTH", dayClosed: true });
    expect(day("2026-10-02")).toMatchObject({ closedDay: true, production: true });
    expect(day("2026-10-03")).toMatchObject({ status: "WORKED", dayClosed: false, today: true });
    expect(day("2026-10-04")).toMatchObject({ status: "REST", planned: true });

    expect(dayCounts(days)).toEqual({
      worked: 2,
      doubleShifts: 1,
      absent: 1,
      rest: 0, // el domingo es previsto
      extraRest: 0,
      leave: 0,
      unmarked: 0,
      production: 1,
    });
  });

  it("lo ganado cada fecha: pago + propina + producción", () => {
    const byDate = moneyByDate([work("2026-09-30", 60_000, 15_000), prod("2026-09-30", 50_000), work("2026-10-01", 60_000, 0)]);
    expect(byDate.get("2026-09-30")).toEqual({ pay: 60_000, tip: 15_000, production: 50_000, total: 125_000 });
    expect(byDate.get("2026-10-01")).toEqual({ pay: 60_000, tip: 0, production: 0, total: 60_000 });
    expect(byDate.has("2026-10-02")).toBe(false);
  });
});

describe("últimas semanas", () => {
  it("la semana y las anteriores, sin las de antes del ingreso", () => {
    expect(recentWeeks(week, 3, null)).toEqual([
      week,
      { from: "2026-09-21", to: "2026-09-27" },
      { from: "2026-09-14", to: "2026-09-20" },
    ]);
    // Ingresó el 23 de septiembre: la semana del 14 al 20 ya no cuenta
    expect(recentWeeks(week, 8, "2026-09-23")).toHaveLength(2);
  });

  it("días, faltas y cómo va el pago de cada semana (igual que Pagos)", () => {
    const weeks = recentWeeks(week, 3, null);
    const entries = [work("2026-09-22", 60_000, 10_000), work("2026-09-23", 60_000, 10_000), work("2026-09-30", 60_000, 5_000)];
    const paid: PaymentRecord = {
      id: "p",
      employeeId: "e",
      from: "2026-09-21",
      to: "2026-09-27",
      amount: 140_000,
      paidAt: "2026-09-28T15:00:00.000Z",
      note: null,
    };
    const marks = [
      { date: "2026-09-22", status: "WORKED" as const },
      { date: "2026-09-23", status: "WORKED" as const },
      { date: "2026-09-24", status: "ABSENT" as const },
      { date: "2026-09-30", status: "WORKED" as const },
    ];
    expect(weekSummaries(weeks, entries, [paid], marks)).toEqual([
      { week, worked: 1, absent: 0, total: 65_000, paid: 0, pending: 65_000, status: "pending" },
      { week: weeks[1], worked: 2, absent: 1, total: 140_000, paid: 140_000, pending: 0, status: "paid" },
      { week: weeks[2], worked: 0, absent: 0, total: 0, paid: 0, pending: 0, status: "none" },
    ]);
  });
});
