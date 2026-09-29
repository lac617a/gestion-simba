import { describe, expect, it } from "vitest";
import { formatHours, hoursFor, parseHours, serializeHours } from "./hours";
import { daySchedule } from "./schedule";

// Lunes a jueves 12–22, viernes y sábado 12–23:30, domingo 12–17.
// (Un 8.º valor viejo de "festivos" en la BD se ignora.)
const HOURS = ["12:00-17:00", "12:00-22:00", "12:00-22:00", "12:00-22:00", "12:00-22:00", "12:00-23:30", "12:00-23:30", "12:00-18:00"];

describe("horario de atención", () => {
  it("parseHours / serializeHours", () => {
    expect(parseHours("12:00-22:00")).toEqual({ open: "12:00", close: "22:00" });
    expect(parseHours("")).toBeNull();
    expect(parseHours(undefined)).toBeNull();
    expect(parseHours("25:00-22:00")).toBeNull();
    expect(serializeHours({ open: "08:30", close: "15:00" })).toBe("08:30-15:00");
    expect(serializeHours(null)).toBe("");
  });

  it("usa el horario del día de la semana", () => {
    expect(hoursFor(daySchedule("2026-09-26"), HOURS)).toEqual({ open: "12:00", close: "23:30" }); // sábado
    expect(hoursFor(daySchedule("2026-09-27"), HOURS)).toEqual({ open: "12:00", close: "17:00" }); // domingo
    expect(hoursFor(daySchedule("2026-09-28"), HOURS)).toEqual({ open: "12:00", close: "22:00" }); // lunes
  });

  it("día marcado como cerrado → sin horario", () => {
    expect(hoursFor(daySchedule("2026-12-25", false), HOURS)).toBeNull();
  });

  it("un antiguo festivo usa el horario de su día de la semana", () => {
    expect(hoursFor(daySchedule("2026-10-12"), HOURS)).toEqual({ open: "12:00", close: "22:00" }); // lunes
    expect(hoursFor(daySchedule("2026-12-08"), HOURS)).toEqual({ open: "12:00", close: "22:00" }); // martes
  });

  it("sin horario configurado", () => {
    expect(hoursFor(daySchedule("2026-09-26"), [])).toBeNull();
  });

  it("formato de 12 horas", () => {
    expect(formatHours({ open: "12:00", close: "22:00" })).toMatch(/^12:00\sp\.\sm\. a 10:00\sp\.\sm\.$/);
    expect(formatHours({ open: "08:30", close: "11:45" })).toMatch(/^8:30\sa\.\sm\. a 11:45\sa\.\sm\.$/);
  });
});
