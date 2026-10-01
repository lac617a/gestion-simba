import { describe, expect, it } from "vitest";
import { buildIcs, eventHash, foldLine, icsText, inviteEmail, reservationEvent } from "./calendar-invite";

const data = {
  id: "res1",
  date: "2026-10-03",
  time: "19:30",
  customerName: "Juan Pérez",
  partySize: 4,
  phone: "300 123 4567",
  occasion: "Cumpleaños",
  honoree: "Laura",
  note: "Mesa afuera; traen torta, velas",
  createdBy: "Laura R.",
};
const opts = { timeZone: "America/Bogota", siteUrl: "https://simba.profiya.com", restaurant: "Simba Parrilla", address: "Vía Guatiguará, Piedecuesta" };
const organizer = { name: "Simba Reservas", email: "reservas@profiya.com" };
const now = new Date("2026-10-01T15:00:00Z");

describe("texto de iCalendar", () => {
  it("escapa barra, punto y coma, coma y saltos de línea", () => {
    expect(icsText("a\\b; c, d\ne")).toBe("a\\\\b\\; c\\, d\\ne");
  });

  it("corta líneas de más de 75 bytes sin partir letras con tilde", () => {
    const folded = foldLine("DESCRIPTION:" + "ñ".repeat(80));
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((l) => l.startsWith(" "))).toBe(true);
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe("DESCRIPTION:" + "ñ".repeat(80));
  });
});

describe("invitación", () => {
  const event = reservationEvent(data, opts);

  it("evento de 2 horas en UTC, con id fijo por reserva", () => {
    expect(event.uid).toBe("reserva-res1@simba.profiya.com");
    expect(event.start.toISOString()).toBe("2026-10-04T00:30:00.000Z");
    expect(event.end.toISOString()).toBe("2026-10-04T02:30:00.000Z");
    expect(event.summary).toBe("Reserva: Juan Pérez (4 personas)");
    expect(event.description).toContain("Ocasión: Cumpleaños de Laura");
    expect(event.description).toContain("https://simba.profiya.com/gestion/reservas/res1");
  });

  it("REQUEST: método, versión, organizador, invitado y CRLF", () => {
    const ics = buildIcs({ ...event, sequence: 1 }, "REQUEST", organizer, "simbaparrilla1@gmail.com", now);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n").filter(Boolean).every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    const unfolded = ics.replace(/\r\n /g, "");
    for (const line of [
      "METHOD:REQUEST",
      "UID:reserva-res1@simba.profiya.com",
      "SEQUENCE:1",
      "DTSTAMP:20261001T150000Z",
      "DTSTART:20261004T003000Z",
      "DTEND:20261004T023000Z",
      "STATUS:CONFIRMED",
      "ORGANIZER;CN=Simba Reservas:mailto:reservas@profiya.com",
      "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:simbaparrilla1@gmail.com",
    ]) {
      expect(unfolded).toContain(`\r\n${line}\r\n`);
    }
    expect(unfolded).toContain("Observación: Mesa afuera\\; traen torta\\, velas");
  });

  it("CANCEL: mismo evento, cancelado", () => {
    const ics = buildIcs({ ...event, sequence: 3 }, "CANCEL", organizer, "simbaparrilla1@gmail.com", now);
    expect(ics).toContain("METHOD:CANCEL\r\n");
    expect(ics).toContain("STATUS:CANCELLED\r\n");
    expect(ics).toContain("SEQUENCE:3\r\n");
    expect(ics).toContain("UID:reserva-res1@simba.profiya.com\r\n");
  });

  it("la huella cambia solo si cambia lo que se ve", () => {
    expect(eventHash(reservationEvent(data, opts))).toBe(eventHash(event));
    expect(eventHash(reservationEvent({ ...data, time: "20:00" }, opts))).not.toBe(eventHash(event));
    expect(eventHash(reservationEvent({ ...data, note: "Otra nota" }, opts))).not.toBe(eventHash(event));
  });

  it("asunto del correo según el caso", () => {
    expect(inviteEmail(data, "new", "Simba", opts.siteUrl).subject).toMatch(/^Nueva reserva: Juan Pérez · .+ \(4 personas\)$/);
    expect(inviteEmail(data, "update", "Simba", opts.siteUrl).subject).toMatch(/^Reserva actualizada: /);
    expect(inviteEmail(data, "cancel", "Simba", opts.siteUrl).subject).toMatch(/^Reserva cancelada: /);
  });
});
