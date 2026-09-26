import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { reservationsCsv, summarizeReservations, type ReservationRecord } from "./reservation-report";
import { confirmationMessage, whatsappHref, whatsappNumber } from "./reservations";

const TODAY = "2026-09-26"; // sábado

const rec = (r: Partial<ReservationRecord>): ReservationRecord => ({
  date: "2026-09-25",
  time: "19:30",
  partySize: 2,
  status: "CONFIRMED",
  customerName: "Cliente",
  phone: null,
  occasion: null,
  honoree: null,
  note: null,
  ...r,
});

describe("WhatsApp", () => {
  it("normaliza el número", () => {
    expect(whatsappNumber("300 123 4567", "57")).toBe("573001234567");
    expect(whatsappNumber("(300) 123-4567", "57")).toBe("573001234567");
    expect(whatsappNumber("57 300 123 4567", "57")).toBe("573001234567");
    expect(whatsappNumber("+57 300 123 4567", "57")).toBe("573001234567");
    expect(whatsappNumber("+1 305 555 0100", "57")).toBe("13055550100");
    expect(whatsappNumber("0034 612 345 678", "57")).toBe("34612345678");
    expect(whatsappNumber("4441234", "57")).toBeNull(); // fijo viejo de 7 dígitos
    expect(whatsappNumber(null, "57")).toBeNull();
  });

  it("mensaje de confirmación", () => {
    const base = { customerName: "Laura Gómez", time: "19:30", partySize: 6, occasion: "Cumpleaños", honoree: "Sofía" };
    const msg = confirmationMessage({ ...base, date: "2026-10-03" }, "Simba", TODAY);
    expect(msg.split("\n")).toEqual([
      "Hola Laura, te escribimos de Simba para confirmar tu reserva:",
      "",
      expect.stringMatching(/^📅 el sábado, 3 de octubre, a las 7:30\sp\.\sm\.$/),
      "👥 6 personas",
      "🎉 Cumpleaños de Sofía",
      "",
      "¡Te esperamos!",
    ]);
    expect(confirmationMessage({ ...base, date: TODAY }, "Simba", TODAY)).toContain("📅 hoy sábado, 26 de septiembre");
    const tomorrow = confirmationMessage({ ...base, date: "2026-09-27", partySize: 1, occasion: null }, "Simba", TODAY);
    expect(tomorrow).toContain("📅 mañana domingo, 27 de septiembre");
    expect(tomorrow).toContain("👥 1 persona");
    expect(tomorrow).not.toContain("🎉");
  });

  it("enlace wa.me con el texto codificado", () => {
    expect(whatsappHref("573001234567", "Hola Ana\n¿5 personas?")).toBe(
      "https://wa.me/573001234567?text=Hola%20Ana%0A%C2%BF5%20personas%3F"
    );
  });
});

describe("reporte de reservas", () => {
  const records = [
    rec({ date: "2026-09-25", time: "19:30", partySize: 4, status: "ARRIVED", occasion: "Cumpleaños" }), // viernes
    rec({ date: "2026-09-25", time: "20:00", partySize: 2, status: "NO_SHOW" }),
    rec({ date: "2026-09-24", time: "13:00", partySize: 6, status: "ARRIVED", occasion: "Aniversario" }), // jueves
    rec({ date: "2026-09-23", time: "19:00", partySize: 3, status: "CONFIRMED", occasion: "Cumpleaños" }), // miércoles, sin marcar
    rec({ date: "2026-09-26", time: "19:15", partySize: 8, status: "CANCELLED", occasion: "Grado" }),
    rec({ date: "2026-09-27", time: "12:30", partySize: 5, status: "CONFIRMED" }), // domingo, por venir
  ];
  const r = summarizeReservations(records, TODAY);

  it("totales y estados (las canceladas aparte)", () => {
    expect(r.totals).toEqual({ count: 5, people: 20, avgParty: 4 });
    expect(r.status).toEqual({
      arrived: 2,
      noShow: 1,
      cancelled: 1,
      upcoming: 1,
      unmarked: 1,
      peopleArrived: 10,
      showRate: 67,
    });
  });

  it("agrupa por día de la semana (lunes primero), hora y ocasión", () => {
    expect(r.byWeekday.map((b) => [b.label, b.count, b.people])).toEqual([
      ["Miércoles", 1, 3],
      ["Jueves", 1, 6],
      ["Viernes", 2, 6],
      ["Domingo", 1, 5],
    ]);
    expect(r.byHour.map((b) => [b.label.replace(/\s/g, " "), b.count])).toEqual([
      ["12:00 p. m.", 1],
      ["1:00 p. m.", 1],
      ["7:00 p. m.", 2],
      ["8:00 p. m.", 1],
    ]);
    expect(r.byOccasion.map((b) => [b.label, b.count])).toEqual([
      ["Cumpleaños", 2],
      ["Aniversario", 1],
      ["Sin ocasión", 2],
    ]);
  });

  it("sin marcar: tasa de llegada null", () => {
    expect(summarizeReservations([rec({})], TODAY).status.showRate).toBeNull();
    expect(summarizeReservations([], TODAY).totals).toEqual({ count: 0, people: 0, avgParty: 0 });
  });

  it("CSV con todas las reservas en orden y el resumen", () => {
    const lines = reservationsCsv(r, { from: "2026-09-21", to: "2026-09-27" }).replace("﻿", "").split("\r\n");
    expect(lines[2]).toBe("Fecha;Hora;A nombre de;Teléfono;Personas;Ocasión;Persona de la ocasión;Estado;Observación");
    expect(lines[3]).toBe("2026-09-23;19:00;Cliente;;3;Cumpleaños;;Confirmada;");
    expect(lines[8]).toBe("2026-09-27;12:30;Cliente;;5;;;Confirmada;");
    expect(lines).toContain("Canceladas;1");
  });
});

describe("CSV", () => {
  it("neutraliza texto que Excel tomaría como fórmula", () => {
    expect(toCsv([["=HYPERLINK(1)", "@x", "-cmd", "+57 300", "-5", "normal"]])).toBe(
      "﻿'=HYPERLINK(1);'@x;'-cmd;+57 300;-5;normal\r\n"
    );
  });
});
