import { describe, expect, it } from "vitest";
import { zonedToUtc } from "./dates";
import { planReminder, reminderEmail } from "./reminders";

const TZ = "America/Bogota";

describe("zonedToUtc", () => {
  it("hora de Bogotá (UTC-5) a UTC, también cruzando la medianoche", () => {
    expect(zonedToUtc("2026-10-03", "19:30", TZ).toISOString()).toBe("2026-10-04T00:30:00.000Z");
    expect(zonedToUtc("2026-10-03", "12:00", TZ).toISOString()).toBe("2026-10-03T17:00:00.000Z");
  });

  it("zonas con cambio de horario", () => {
    expect(zonedToUtc("2026-07-01", "20:00", "America/New_York").toISOString()).toBe("2026-07-02T00:00:00.000Z");
    expect(zonedToUtc("2026-01-15", "20:00", "America/New_York").toISOString()).toBe("2026-01-16T01:00:00.000Z");
  });
});

describe("planReminder", () => {
  const r = { status: "CONFIRMED" as const, date: "2026-10-03", time: "19:30" };
  const at = (iso: string) => new Date(iso);

  it("programa 1 hora antes", () => {
    const plan = planReminder(r, TZ, at("2026-09-30T02:00:00Z"), true);
    expect(plan).toEqual({ kind: "schedule", at: at("2026-10-03T23:30:00Z") }); // 6:30 p. m. en Bogotá
  });

  it("a menos de 1 hora se manda ya; empezada, nada", () => {
    expect(planReminder(r, TZ, at("2026-10-04T00:00:00Z"), true)).toEqual({ kind: "send-now" });
    expect(planReminder(r, TZ, at("2026-10-04T00:30:00Z"), true)).toEqual({ kind: "none", reason: "started" });
  });

  it("solo confirmadas, con correo configurado y a menos de 29 días", () => {
    const now = at("2026-09-30T02:00:00Z");
    expect(planReminder({ ...r, status: "CANCELLED" }, TZ, now, true)).toEqual({ kind: "none", reason: "not-confirmed" });
    expect(planReminder({ ...r, status: "ARRIVED" }, TZ, now, true)).toEqual({ kind: "none", reason: "not-confirmed" });
    expect(planReminder(r, TZ, now, false)).toEqual({ kind: "none", reason: "disabled" });
    expect(planReminder({ ...r, date: "2026-11-20" }, TZ, now, true)).toEqual({ kind: "none", reason: "too-far" });
  });
});

describe("reminderEmail", () => {
  const base = {
    id: "abc",
    date: "2026-10-03",
    time: "19:30",
    customerName: "Juan <b>Pérez</b>",
    partySize: 4,
    phone: "300 123 4567",
    occasion: "Cumpleaños",
    honoree: "Laura",
    note: "Traen torta & velas",
    createdBy: "Laura R.",
  };

  it("asunto, texto y enlace a la reserva", () => {
    const e = reminderEmail(base, "Simba", "https://simba.profiya.com");
    expect(e.subject).toBe("Reserva a las 7:30 p. m.: Juan <b>Pérez</b> (4 personas)");
    expect(e.text).toContain("Ocasión: Cumpleaños de Laura");
    expect(e.text).toContain("Registrada por: Laura R.");
    expect(e.text).toContain("https://simba.profiya.com/gestion/reservas/abc");
  });

  it("el HTML escapa lo que escribió el usuario", () => {
    const { html } = reminderEmail(base, "Simba", "https://simba.profiya.com");
    expect(html).toContain("Juan &lt;b&gt;Pérez&lt;/b&gt;");
    expect(html).toContain("Traen torta &amp; velas");
    expect(html).not.toContain("<b>Pérez</b>");
  });

  it("sin datos opcionales no salen sus filas", () => {
    const e = reminderEmail({ ...base, phone: null, occasion: null, note: null, createdBy: null, partySize: 1 }, "Simba", "https://x.co");
    expect(e.text).not.toMatch(/Teléfono|Ocasión|Observación|Registrada/);
    expect(e.subject).toContain("(1 persona)");
  });
});
