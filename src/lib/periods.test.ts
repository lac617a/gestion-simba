import { describe, expect, it } from "vitest";
import { elapsedDays, fortnightRange, monthRange, shiftPeriod, weekRange } from "./periods";

describe("rangos", () => {
  it("weekRange de lunes a domingo y con otro inicio", () => {
    expect(weekRange("2026-09-23", 1)).toEqual({ from: "2026-09-21", to: "2026-09-27" });
    expect(weekRange("2026-09-27", 1)).toEqual({ from: "2026-09-21", to: "2026-09-27" });
    expect(weekRange("2026-09-22", 3)).toEqual({ from: "2026-09-16", to: "2026-09-22" });
  });

  it("monthRange respeta meses cortos y bisiestos", () => {
    expect(monthRange("2026-09-24")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(monthRange("2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-12-31")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("fortnightRange", () => {
    expect(fortnightRange("2026-09-15")).toEqual({ from: "2026-09-01", to: "2026-09-15" });
    expect(fortnightRange("2026-09-16")).toEqual({ from: "2026-09-16", to: "2026-09-30" });
    expect(fortnightRange("2026-02-20")).toEqual({ from: "2026-02-16", to: "2026-02-28" });
  });
});

describe("shiftPeriod", () => {
  it("meses saltan al mes vecino aunque tengan distinto largo", () => {
    expect(shiftPeriod({ from: "2026-03-01", to: "2026-03-31" }, -1)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(shiftPeriod({ from: "2026-12-01", to: "2026-12-31" }, 1)).toEqual({ from: "2027-01-01", to: "2027-01-31" });
  });

  it("quincenas saltan a la quincena vecina", () => {
    expect(shiftPeriod({ from: "2026-09-01", to: "2026-09-15" }, 1)).toEqual({ from: "2026-09-16", to: "2026-09-30" });
    expect(shiftPeriod({ from: "2026-09-01", to: "2026-09-15" }, -1)).toEqual({ from: "2026-08-16", to: "2026-08-31" });
  });

  it("otros rangos se desplazan por su largo", () => {
    expect(shiftPeriod({ from: "2026-09-21", to: "2026-09-27" }, 1)).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(shiftPeriod({ from: "2026-09-05", to: "2026-09-07" }, -1)).toEqual({ from: "2026-09-02", to: "2026-09-04" });
  });
});

describe("elapsedDays", () => {
  it("cuenta hasta hoy dentro del periodo", () => {
    expect(elapsedDays({ from: "2026-09-21", to: "2026-09-27" }, "2026-09-24")).toBe(4);
    expect(elapsedDays({ from: "2026-09-01", to: "2026-09-15" }, "2026-09-24")).toBe(15);
    expect(elapsedDays({ from: "2026-10-01", to: "2026-10-31" }, "2026-09-24")).toBe(0);
  });
});
