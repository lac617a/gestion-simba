import { describe, expect, it } from "vitest";
import { describeLog, diffReservation, reservationHistory, type ReservationSnapshot } from "./reservation-log";

const base: ReservationSnapshot = {
  date: "2026-10-03",
  time: "19:30",
  partySize: 2,
  customerName: "Juan Pérez",
  phone: null,
  occasion: null,
  honoree: null,
  note: null,
};
const at = (iso: string) => new Date(iso);

describe("diffReservation", () => {
  it("sin cambios", () => {
    expect(diffReservation(base, { ...base })).toEqual([]);
  });

  it("solo lo que cambió; vacío y null cuentan igual", () => {
    expect(diffReservation({ ...base, note: "" }, { ...base, note: null })).toEqual([]);
    expect(diffReservation(base, { ...base, time: "20:00", partySize: 4, phone: "300 123 4567" })).toEqual([
      { field: "time", from: "19:30", to: "20:00" },
      { field: "partySize", from: 2, to: 4 },
      { field: "phone", from: null, to: "300 123 4567" },
    ]);
  });
});

describe("describeLog", () => {
  const entry = (action: "CREATED" | "UPDATED" | "STATUS", changes: never[] | object[] | null) =>
    ({ action, changes, at: at("2026-10-01T15:00:00Z"), user: "Laura" }) as Parameters<typeof describeLog>[0];

  it("edición con el detalle de cada dato", () => {
    const d = describeLog(entry("UPDATED", diffReservation(base, { ...base, date: "2026-10-04", time: "20:00", note: "Traen torta" })));
    expect(d.title).toBe("Editó la reserva");
    expect(d.details[0]).toMatch(/^Fecha: .*3.* → .*4/);
    expect(d.details[1]).toBe("Hora: 7:30 p. m. → 8:00 p. m.");
    expect(d.details[2]).toBe("Observación: (vacío) → Traen torta");
  });

  it("estados", () => {
    const status = (from: string, to: string) => describeLog(entry("STATUS", [{ field: "status", from, to }])).title;
    expect(status("CONFIRMED", "ARRIVED")).toBe("Marcó Llegó");
    expect(status("CONFIRMED", "NO_SHOW")).toBe("Marcó No vino");
    expect(status("CONFIRMED", "CANCELLED")).toBe("Canceló la reserva");
    expect(status("CANCELLED", "CONFIRMED")).toBe("La volvió a confirmar");
    expect(status("ARRIVED", "CONFIRMED")).toBe("Quitó la marca «Llegó»");
    expect(describeLog(entry("CREATED", null)).title).toBe("Creó la reserva");
  });
});

describe("reservationHistory", () => {
  const edit = { action: "UPDATED" as const, changes: [], at: at("2026-10-02T10:00:00Z"), user: "Ana" };

  it("agrega la creación de las reservas anteriores al historial y ordena del más reciente al más viejo", () => {
    const h = reservationHistory([edit], { at: at("2026-09-29T20:00:00Z"), user: "Laura" });
    expect(h.map((e) => [e.action, e.user])).toEqual([
      ["UPDATED", "Ana"],
      ["CREATED", "Laura"],
    ]);
  });

  it("si ya tiene la creación no la repite", () => {
    const created = { action: "CREATED" as const, changes: null, at: at("2026-10-01T09:00:00Z"), user: "Laura" };
    expect(reservationHistory([created, edit], { at: at("2026-10-01T09:00:00Z"), user: "Laura" })).toHaveLength(2);
  });
});
