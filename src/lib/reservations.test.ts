import { describe, expect, it } from "vitest";
import * as z from "zod";
import {
  dayTotals,
  occasionLabel,
  parseReservationForm,
  outsideHoursWarning,
  splitOccasion,
} from "./reservations";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  const base = { customerName: "Laura Gómez", partySize: "4", date: "2026-10-03", time: "19:30" };
  for (const [k, v] of Object.entries({ ...base, ...fields })) fd.append(k, v);
  return fd;
}

describe("formulario de reserva", () => {
  it("datos mínimos", () => {
    expect(parseReservationForm(form({})).data).toEqual({
      customerName: "Laura Gómez",
      phone: null,
      partySize: 4,
      date: "2026-10-03",
      time: "19:30",
      occasion: null,
      honoree: null,
      note: null,
    });
  });

  it("ocasión del selector con persona de la ocasión", () => {
    const data = parseReservationForm(form({ occasionChoice: "Cumpleaños", honoree: " Sofía ", note: "Traen torta" })).data;
    expect(data).toMatchObject({ occasion: "Cumpleaños", honoree: "Sofía", note: "Traen torta" });
  });

  it("'Otra' usa el texto libre", () => {
    const data = parseReservationForm(form({ occasionChoice: "Otra", occasionOther: "Baby shower" })).data;
    expect(data?.occasion).toBe("Baby shower");
  });

  it("sin ocasión se descarta la persona de la ocasión", () => {
    expect(parseReservationForm(form({ occasionChoice: "", honoree: "Sofía" })).data?.honoree).toBeNull();
  });

  it("valida nombre, personas, fecha, hora y teléfono", () => {
    const errors = (f: Record<string, string>) => Object.keys(z.flattenError(parseReservationForm(form(f)).error ?? new z.ZodError([])).fieldErrors);
    expect(errors({ customerName: " " })).toEqual(["customerName"]);
    expect(errors({ partySize: "0" })).toEqual(["partySize"]);
    expect(errors({ partySize: "2.5" })).toEqual(["partySize"]);
    expect(errors({ partySize: "" })).toEqual(["partySize"]);
    expect(errors({ date: "" })).toEqual(["date"]);
    expect(errors({ time: "25:00" })).toEqual(["time"]);
    expect(errors({ phone: "abc" })).toEqual(["phone"]);
    expect(errors({ phone: "300 123 4567" })).toEqual([]);
  });
});

describe("ocasión", () => {
  it("splitOccasion", () => {
    expect(splitOccasion(null)).toEqual({ choice: "", other: "" });
    expect(splitOccasion("Aniversario")).toEqual({ choice: "Aniversario", other: "" });
    expect(splitOccasion("Baby shower")).toEqual({ choice: "Otra", other: "Baby shower" });
  });

  it("occasionLabel", () => {
    expect(occasionLabel("Cumpleaños", "Sofía")).toBe("Cumpleaños de Sofía");
    expect(occasionLabel("Aniversario", null)).toBe("Aniversario");
    expect(occasionLabel(null, "Sofía")).toBeNull();
  });
});

describe("avisos y totales", () => {
  const hours = { open: "12:00", close: "22:00" };

  it("fuera del horario", () => {
    expect(outsideHoursWarning(hours, "19:00")).toBeNull();
    expect(outsideHoursWarning(hours, "12:00")).toBeNull();
    expect(outsideHoursWarning(hours, "11:30")).toMatch(/^11:30\sa\.\sm\. está fuera del horario/);
    expect(outsideHoursWarning(hours, "22:00")).toMatch(/fuera del horario/);
    expect(outsideHoursWarning(null, "08:00")).toBeNull(); // sin horario configurado o día cerrado
  });

  it("las canceladas no cuentan", () => {
    expect(
      dayTotals([
        { partySize: 4, status: "CONFIRMED" },
        { partySize: 2, status: "ARRIVED" },
        { partySize: 6, status: "CANCELLED" },
        { partySize: 3, status: "NO_SHOW" },
      ])
    ).toEqual({ count: 3, people: 9 });
  });
});
