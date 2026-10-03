import { describe, expect, it } from "vitest";
import { addMonths, formatMonth, isISOMonth, monthOf } from "./dates";
import { employeeCalendar, monthCounts, type CalendarInput } from "./employee-history";
import { monthPeriod } from "./periods";

const base: CalendarInput = {
  month: "2026-10",
  today: "2026-10-03",
  weekStart: 1,
  hireDate: null,
  restDays: [],
  timeOff: [],
  attendance: new Map(),
  production: new Set(),
  closedDays: new Set(),
};

describe("meses", () => {
  it("validar, mes de una fecha, sumar meses y su rango", () => {
    expect(isISOMonth("2026-10")).toBe(true);
    expect(isISOMonth("2026-13")).toBe(false);
    expect(isISOMonth("2026-1")).toBe(false);
    expect(monthOf("2026-10-03")).toBe("2026-10");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", -13)).toBe("2025-09");
    expect(monthPeriod("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(formatMonth("2026-10")).toBe("octubre de 2026");
  });
});

describe("calendario del empleado", () => {
  it("filas de 7 desde el día de inicio de la semana de pago, con huecos fuera del mes", () => {
    // El 1 de octubre de 2026 es jueves
    const weeks = employeeCalendar(base);
    expect(weeks).toHaveLength(5);
    expect(weeks[0].map((d) => d?.date ?? null)).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(weeks[4].map((d) => d?.date ?? null)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
    // Empezando en domingo
    expect(employeeCalendar({ ...base, weekStart: 0 })[0].filter((d) => d === null)).toHaveLength(4);
    // Febrero de 2027 empieza en lunes y tiene 28 días: 4 filas sin huecos
    const feb = employeeCalendar({ ...base, month: "2027-02" });
    expect(feb).toHaveLength(4);
    expect(feb.flat().every((d) => d !== null)).toBe(true);
  });

  it("lo marcado, la producción, los cierres, antes de ingresar y lo previsto de los días que vienen", () => {
    const weeks = employeeCalendar({
      ...base,
      hireDate: "2026-10-02",
      restDays: [1], // lunes
      timeOff: [{ type: "LEAVE", startDate: "2026-10-20", endDate: "2026-10-22" }],
      attendance: new Map([
        ["2026-10-02", { status: "WORKED", shift: "BOTH" }],
        ["2026-10-03", { status: "PENDING", shift: null }],
      ]),
      production: new Set(["2026-10-02", "2026-10-09"]),
      closedDays: new Set(["2026-10-06"]),
    });
    const day = (date: string) => weeks.flat().find((d) => d?.date === date)!;

    expect(day("2026-10-01")).toMatchObject({ beforeHire: true, status: null });
    expect(day("2026-10-02")).toMatchObject({ status: "WORKED", shift: "BOTH", production: true, planned: false });
    expect(day("2026-10-03")).toMatchObject({ status: "PENDING", today: true });
    expect(day("2026-10-04")).toMatchObject({ status: null, planned: false });
    expect(day("2026-10-05")).toMatchObject({ status: "REST", planned: true });
    expect(day("2026-10-06")).toMatchObject({ closedDay: true, status: null });
    expect(day("2026-10-09")).toMatchObject({ production: true, status: null });
    expect(day("2026-10-21")).toMatchObject({ status: "LEAVE", planned: true });

    // Lo previsto no cuenta como pasado
    expect(monthCounts(weeks)).toEqual({
      worked: 1,
      doubleShifts: 1,
      absent: 0,
      rest: 0,
      extraRest: 0,
      leave: 0,
      unmarked: 1,
      production: 2,
    });
  });

  it("un día pasado sin asistencia queda vacío (no se supone nada)", () => {
    const weeks = employeeCalendar({ ...base, restDays: [4] }); // jueves
    expect(weeks[0][3]).toMatchObject({ date: "2026-10-01", status: null, planned: false });
    expect(weeks[1][3]).toMatchObject({ date: "2026-10-08", status: "REST", planned: true });
  });
});
