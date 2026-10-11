import { describe, expect, it } from "vitest";
import { isPayWeek, payCalendar, payDateOf, payDue, payWeekOf, shiftPayWeek, weekHolidays } from "./payday";

const MON = 1;
const TUE = 2;
const WED = 3;
const SUN = 0;

const cal = (payWeekStart: number, payDay: number, payHolidaysOff: string[] = []) =>
  payCalendar({ payWeekStart, payDay, payHolidaysOff });

/** Semana de lunes a domingo, pago el lunes (la del restaurante). */
const simba = cal(MON, MON);

describe("día de pago", () => {
  it("semana lunes–domingo se paga el lunes siguiente", () => {
    expect(payDateOf({ from: "2026-09-21", to: "2026-09-27" }, simba)).toBe("2026-09-28");
  });

  it("lunes: hoy es día de pago de la semana anterior", () => {
    expect(payDue("2026-09-28", simba)).toEqual({
      week: { from: "2026-09-21", to: "2026-09-27" },
      payDate: "2026-09-28",
      status: "today",
    });
  });

  it("después del lunes: pago atrasado; el domingo aún es la semana anterior", () => {
    expect(payDue("2026-09-29", simba)).toMatchObject({ week: { from: "2026-09-21" }, status: "late" });
    expect(payDue("2026-10-04", simba)).toMatchObject({ week: { from: "2026-09-21" }, status: "late" });
  });

  it("pago el último día de la semana: esa misma semana", () => {
    expect(payDue("2026-09-27", cal(MON, SUN))).toEqual({
      week: { from: "2026-09-21", to: "2026-09-27" },
      payDate: "2026-09-27",
      status: "today",
    });
    expect(payDue("2026-09-28", cal(MON, SUN))).toMatchObject({ week: { from: "2026-09-21" }, status: "late" });
  });

  it("pago un par de días después: primero se anuncia", () => {
    // Semana martes–lunes, pago el miércoles
    expect(payDue("2026-09-29", cal(TUE, WED))).toEqual({
      week: { from: "2026-09-22", to: "2026-09-28" },
      payDate: "2026-09-30",
      status: "upcoming",
    });
    expect(payDue("2026-09-30", cal(TUE, WED)).status).toBe("today");
  });
});

describe("lunes festivo", () => {
  // El lunes 12 de octubre de 2026 es festivo (Día de la Raza)
  const long = { from: "2026-10-05", to: "2026-10-12" };
  const short = { from: "2026-10-13", to: "2026-10-18" };

  it("la semana termina el lunes festivo (8 días) y la siguiente va de martes a domingo", () => {
    expect(payWeekOf("2026-10-07", simba)).toEqual(long);
    expect(payWeekOf("2026-10-11", simba)).toEqual(long);
    expect(payWeekOf("2026-10-12", simba)).toEqual(long);
    expect(payWeekOf("2026-10-13", simba)).toEqual(short);
    expect(payWeekOf("2026-10-18", simba)).toEqual(short);
    expect(payWeekOf("2026-10-19", simba)).toEqual({ from: "2026-10-19", to: "2026-10-25" });
  });

  it("se paga el martes; la semana corta, el lunes de siempre", () => {
    expect(payDateOf(long, simba)).toBe("2026-10-13");
    expect(payDateOf(short, simba)).toBe("2026-10-19");
  });

  it("el lunes festivo todavía no se paga esa semana; el martes es el día de pago", () => {
    expect(payDue("2026-10-12", simba)).toMatchObject({ week: { from: "2026-09-28", to: "2026-10-04" }, status: "late" });
    expect(payDue("2026-10-13", simba)).toEqual({ week: long, payDate: "2026-10-13", status: "today" });
    expect(payDue("2026-10-19", simba)).toEqual({ week: short, payDate: "2026-10-19", status: "today" });
  });

  it("semana anterior y siguiente respetan los festivos", () => {
    expect(shiftPayWeek({ from: "2026-09-28", to: "2026-10-04" }, 1, simba)).toEqual(long);
    expect(shiftPayWeek(long, 1, simba)).toEqual(short);
    expect(shiftPayWeek(short, -1, simba)).toEqual(long);
    expect(shiftPayWeek(long, -1, simba)).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(isPayWeek(long, simba)).toBe(true);
    expect(isPayWeek({ from: "2026-10-05", to: "2026-10-11" }, simba)).toBe(false);
  });

  it("dice qué festivo movió cada borde de la semana", () => {
    expect(weekHolidays(long, simba)).toEqual({ startsAfter: null, endsOn: "2026-10-12" });
    expect(weekHolidays(short, simba)).toEqual({ startsAfter: "2026-10-12", endsOn: null });
    expect(weekHolidays({ from: "2026-09-28", to: "2026-10-04" }, simba)).toEqual({ startsAfter: null, endsOn: null });
  });

  it("si se apaga ese festivo en Configuración, la semana es la normal", () => {
    const off = cal(MON, MON, ["2026-10-12"]);
    expect(payWeekOf("2026-10-12", off)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(payWeekOf("2026-10-11", off)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(payDue("2026-10-12", off)).toEqual({
      week: { from: "2026-10-05", to: "2026-10-11" },
      payDate: "2026-10-12",
      status: "today",
    });
    // Los demás festivos siguen alargando su semana
    expect(payWeekOf("2026-11-01", off)).toEqual({ from: "2026-10-26", to: "2026-11-02" });
  });

  it("dos lunes festivos seguidos (8 y 15 de junio de 2026): martes a lunes en medio", () => {
    expect(payWeekOf("2026-06-03", simba)).toEqual({ from: "2026-06-01", to: "2026-06-08" });
    expect(payWeekOf("2026-06-10", simba)).toEqual({ from: "2026-06-09", to: "2026-06-15" });
    expect(payDateOf({ from: "2026-06-09", to: "2026-06-15" }, simba)).toBe("2026-06-16");
    expect(payWeekOf("2026-06-16", simba)).toEqual({ from: "2026-06-16", to: "2026-06-21" });
  });

  it("un festivo que no es lunes no cambia nada (martes 8 de diciembre)", () => {
    expect(payWeekOf("2026-12-08", simba)).toEqual({ from: "2026-12-07", to: "2026-12-13" });
    expect(payDateOf({ from: "2026-11-30", to: "2026-12-06" }, simba)).toBe("2026-12-07");
  });

  it("con otra semana de pago solo se corre el pago que caía en el lunes festivo", () => {
    // Semana domingo–sábado, pago el lunes
    expect(payWeekOf("2026-10-12", cal(SUN, MON))).toEqual({ from: "2026-10-11", to: "2026-10-17" });
    expect(payDateOf({ from: "2026-10-04", to: "2026-10-10" }, cal(SUN, MON))).toBe("2026-10-13");
    // Semana martes–lunes, pago el miércoles: nada cambia
    expect(payWeekOf("2026-10-12", cal(TUE, WED))).toEqual({ from: "2026-10-06", to: "2026-10-12" });
    expect(payDateOf({ from: "2026-10-06", to: "2026-10-12" }, cal(TUE, WED))).toBe("2026-10-14");
  });
});
