import { describe, expect, it } from "vitest";
import {
  attendanceCsv,
  salesCsv,
  salesSeries,
  summarizeAttendance,
  summarizeSales,
  summarizeTips,
  tipsCsv,
} from "./reports";

const period = { from: "2026-09-21", to: "2026-09-27" };

describe("summarizeSales", () => {
  it("totales, promedio por día cerrado y mejor día", () => {
    const s = summarizeSales([
      { date: "2026-09-23", totalSales: 1_000_000, tipsTotal: 80_000, workers: 3 },
      { date: "2026-09-21", totalSales: 900_000, tipsTotal: 90_000, workers: 2 },
      { date: "2026-09-22", totalSales: 1_500_001, tipsTotal: 120_000, workers: 3 },
    ]);
    expect(s.days.map((d) => d.date)).toEqual(["2026-09-21", "2026-09-22", "2026-09-23"]);
    expect(s.totalSales).toBe(3_400_001);
    expect(s.tipsTotal).toBe(290_000);
    expect(s.avgSales).toBe(1_133_334);
    expect(s.best?.date).toBe("2026-09-22");
  });

  it("sin días", () => {
    expect(summarizeSales([])).toEqual({ days: [], totalSales: 0, tipsTotal: 0, avgSales: 0, best: null });
  });

  it("CSV", () => {
    const csv = salesCsv(summarizeSales([{ date: "2026-09-21", totalSales: 900_000, tipsTotal: 90_000, workers: 2 }]), period, 0);
    expect(csv).toContain("2026-09-21;900000;90000;2");
    expect(csv).toContain("Promedio por día;900000;;");
  });
});

describe("salesSeries", () => {
  const day = (date: string, totalSales: number) => ({ date, totalSales, tipsTotal: totalSales / 10, workers: 3 });

  it("una barra por día, con huecos para días sin cierre", () => {
    const s = salesSeries([day("2026-09-21", 100), day("2026-09-23", 300)], "2026-09-21", "2026-09-24");
    expect(s.unit).toBe("day");
    expect(s.bins.map((b) => [b.from, b.sales, b.closedDays])).toEqual([
      ["2026-09-21", 100, 1],
      ["2026-09-22", 0, 0],
      ["2026-09-23", 300, 1],
      ["2026-09-24", 0, 0],
    ]);
  });

  it("rangos largos se agrupan por semana (la última puede ser corta)", () => {
    const days = [day("2026-01-01", 10), day("2026-01-07", 20), day("2026-01-08", 5), day("2026-03-15", 7)];
    const s = salesSeries(days, "2026-01-01", "2026-03-15"); // 74 días
    expect(s.unit).toBe("week");
    expect(s.bins[0]).toMatchObject({ from: "2026-01-01", to: "2026-01-07", sales: 30, closedDays: 2 });
    expect(s.bins[1]).toMatchObject({ from: "2026-01-08", sales: 5 });
    expect(s.bins.at(-1)).toMatchObject({ from: "2026-03-12", to: "2026-03-15", sales: 7 });
    expect(s.bins).toHaveLength(11);
  });
});

describe("summarizeTips", () => {
  it("suma por empleado y cuenta días con propina > 0", () => {
    const t = summarizeTips([
      { employeeId: "b", name: "Bruno", amount: 40_000 },
      { employeeId: "a", name: "Ana", amount: 45_000 },
      { employeeId: "a", name: "Ana", amount: 0 },
      { employeeId: "a", name: "Ana", amount: 60_000 },
    ]);
    expect(t.employees).toEqual([
      { employeeId: "a", name: "Ana", total: 105_000, days: 2 },
      { employeeId: "b", name: "Bruno", total: 40_000, days: 1 },
    ]);
    expect(t.total).toBe(145_000);
    expect(tipsCsv(t, period, 0)).toContain("Ana;2;105000");
  });
});

describe("summarizeAttendance", () => {
  it("cuenta cada estado por empleado y en total", () => {
    const a = summarizeAttendance([
      { employeeId: "a", name: "Ana", status: "WORKED" },
      { employeeId: "a", name: "Ana", status: "WORKED" },
      { employeeId: "a", name: "Ana", status: "REST" },
      { employeeId: "c", name: "Carla", status: "ABSENT" },
      { employeeId: "c", name: "Carla", status: "PENDING" },
    ]);
    expect(a.employees[0]).toMatchObject({ name: "Ana", counts: { WORKED: 2, REST: 1, ABSENT: 0 } });
    expect(a.employees[1]).toMatchObject({ name: "Carla", counts: { ABSENT: 1, PENDING: 1 } });
    expect(a.totals).toMatchObject({ WORKED: 2, REST: 1, ABSENT: 1, PENDING: 1 });

    const csv = attendanceCsv(a, period);
    expect(csv).toContain("Empleado;Trabajó;Descanso;Permiso;Falta;Vacaciones;Pendiente");
    expect(csv).toContain("Ana;2;1;0;0;0;0");
  });
});
