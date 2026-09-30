import { describe, expect, it } from "vitest";
import { localNow } from "./dates";
import { hoursOn, isPastSlot, quickDateLabel, quickDates, timeSlots } from "./reservation-slots";

describe("timeSlots", () => {
  it("cada 30 minutos desde que abre hasta media hora antes de cerrar", () => {
    const s = timeSlots({ open: "12:00", close: "22:00" });
    expect(s[0]).toBe("12:00");
    expect(s.at(-1)).toBe("21:30");
    expect(s).toHaveLength(20);
  });

  it("si abre a una hora no redonda, empieza en la siguiente media hora", () => {
    expect(timeSlots({ open: "17:15", close: "19:00" })).toEqual(["17:30", "18:00", "18:30"]);
  });

  it("sin horario usa 11:00 a 23:00", () => {
    const s = timeSlots(null);
    expect([s[0], s.at(-1)]).toEqual(["11:00", "22:30"]);
  });
});

describe("isPastSlot", () => {
  const now = { date: "2026-09-29", time: "19:10" };

  it("días anteriores y posteriores", () => {
    expect(isPastSlot("2026-09-28", "23:00", now)).toBe(true);
    expect(isPastSlot("2026-09-30", "08:00", now)).toBe(false);
  });

  it("hoy: compara la hora, con margen opcional", () => {
    expect(isPastSlot("2026-09-29", "19:00", now)).toBe(true);
    expect(isPastSlot("2026-09-29", "19:10", now)).toBe(false);
    expect(isPastSlot("2026-09-29", "19:30", now)).toBe(false);
    expect(isPastSlot("2026-09-29", "19:00", now, 10)).toBe(false);
    expect(isPastSlot("2026-09-29", "18:59", now, 10)).toBe(true);
  });
});

describe("fechas rápidas", () => {
  it("hoy y los 6 días siguientes, con etiqueta corta", () => {
    const days = quickDates("2026-09-29");
    expect(days).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]);
    expect(quickDateLabel(days[0], days[0])).toEqual({ top: "Hoy", bottom: "29 sept" });
    expect(quickDateLabel(days[1], days[0]).top).toBe("Mañana");
    expect(quickDateLabel(days[2], days[0])).toEqual({ top: "jue", bottom: "1 oct" });
  });

  it("horario del día según su día de la semana", () => {
    const hours = ["", "", "12:00-22:00", "", "", "", "11:00-23:00"]; // martes y sábado
    expect(hoursOn("2026-09-29", hours)).toEqual({ open: "12:00", close: "22:00" });
    expect(hoursOn("2026-10-03", hours)).toEqual({ open: "11:00", close: "23:00" });
    expect(hoursOn("2026-09-30", hours)).toBeNull();
  });
});

describe("localNow", () => {
  it("fecha y hora del reloj en la zona del restaurante", () => {
    // 02:30 UTC del 30 = 21:30 del 29 en Bogotá (UTC-5)
    expect(localNow("America/Bogota", new Date("2026-09-30T02:30:00Z"))).toEqual({ date: "2026-09-29", time: "21:30" });
  });
});
