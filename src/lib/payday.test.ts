import { describe, expect, it } from "vitest";
import { payDateOf, payDue } from "./payday";

const MON = 1;
const TUE = 2;
const WED = 3;
const SUN = 0;

describe("día de pago", () => {
  it("semana lunes–domingo se paga el lunes siguiente", () => {
    expect(payDateOf({ from: "2026-09-21", to: "2026-09-27" }, MON)).toBe("2026-09-28");
  });

  it("lunes: hoy es día de pago de la semana anterior", () => {
    expect(payDue("2026-09-28", MON, MON)).toEqual({
      week: { from: "2026-09-21", to: "2026-09-27" },
      payDate: "2026-09-28",
      status: "today",
    });
  });

  it("después del lunes: pago atrasado; el domingo aún es la semana anterior", () => {
    expect(payDue("2026-09-29", MON, MON)).toMatchObject({ week: { from: "2026-09-21" }, status: "late" });
    expect(payDue("2026-10-04", MON, MON)).toMatchObject({ week: { from: "2026-09-21" }, status: "late" });
  });

  it("pago el último día de la semana: esa misma semana", () => {
    expect(payDue("2026-09-27", MON, SUN)).toEqual({
      week: { from: "2026-09-21", to: "2026-09-27" },
      payDate: "2026-09-27",
      status: "today",
    });
    expect(payDue("2026-09-28", MON, SUN)).toMatchObject({ week: { from: "2026-09-21" }, status: "late" });
  });

  it("pago un par de días después: primero se anuncia", () => {
    // Semana martes–lunes, pago el miércoles
    expect(payDue("2026-09-29", TUE, WED)).toEqual({
      week: { from: "2026-09-22", to: "2026-09-28" },
      payDate: "2026-09-30",
      status: "upcoming",
    });
    expect(payDue("2026-09-30", TUE, WED).status).toBe("today");
  });
});
