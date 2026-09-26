import { describe, expect, it } from "vitest";
import { formatHours, hoursFor, parseHours, serializeHours } from "./hours";
import { daySchedule } from "./schedule";

// Martes a sábado 12–22, domingo 12–17, lunes vacío (cierra), festivos 12–18.
const HOURS = ["12:00-17:00", "", "12:00-22:00", "12:00-22:00", "12:00-22:00", "12:00-23:30", "12:00-23:30", "12:00-18:00"];
const MONDAY = [1];

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
    expect(hoursFor(daySchedule("2026-09-26", MONDAY), HOURS)).toEqual({ open: "12:00", close: "23:30" }); // sábado
    expect(hoursFor(daySchedule("2026-09-27", MONDAY), HOURS)).toEqual({ open: "12:00", close: "17:00" }); // domingo
  });

  it("día cerrado → sin horario", () => {
    expect(hoursFor(daySchedule("2026-09-28", MONDAY), HOURS)).toBeNull(); // lunes
    expect(hoursFor(daySchedule("2026-10-13", MONDAY), HOURS)).toBeNull(); // martes tras lunes festivo
    expect(hoursFor(daySchedule("2026-09-30", MONDAY, false), HOURS)).toBeNull(); // excepción: cerrado
  });

  it("festivo: usa la fila de festivos; sin ella, la del día", () => {
    expect(hoursFor(daySchedule("2026-10-12", MONDAY), HOURS)).toEqual({ open: "12:00", close: "18:00" }); // lunes festivo
    const noHoliday = HOURS.slice(0, 7);
    expect(hoursFor(daySchedule("2026-12-08", MONDAY), noHoliday)).toEqual({ open: "12:00", close: "22:00" }); // martes festivo
    expect(hoursFor(daySchedule("2026-10-12", MONDAY), noHoliday)).toBeNull(); // lunes festivo sin horario de lunes
  });

  it("sin horario configurado", () => {
    expect(hoursFor(daySchedule("2026-09-26", MONDAY), [])).toBeNull();
  });

  it("formato de 12 horas", () => {
    expect(formatHours({ open: "12:00", close: "22:00" })).toMatch(/^12:00\sp\.\sm\. a 10:00\sp\.\sm\.$/);
    expect(formatHours({ open: "08:30", close: "11:45" })).toMatch(/^8:30\sa\.\sm\. a 11:45\sa\.\sm\.$/);
  });
});
