import { describe, expect, it } from "vitest";
import { extraField, parseProductionForm, productionTotal } from "./production";

function form(fields: { date?: string; note?: string; ids?: string[]; extras?: Record<string, string> }) {
  const fd = new FormData();
  fd.append("date", fields.date ?? "2026-09-30");
  fd.append("note", fields.note ?? "");
  for (const id of fields.ids ?? []) fd.append("employeeId", id);
  for (const [id, v] of Object.entries(fields.extras ?? {})) fd.append(extraField(id), v);
  return fd;
}

describe("jornada de producción", () => {
  it("fecha, nota y asistentes con su excedente (vacío = 0)", () => {
    const r = parseProductionForm(
      form({ note: " Salsas y carnes ", ids: ["ana", "bruno", "ana"], extras: { ana: "10.000", bruno: "" } }),
      0
    );
    expect(r).toEqual({
      success: true,
      data: {
        date: "2026-09-30",
        note: "Salsas y carnes",
        attendees: [
          { employeeId: "ana", extraPay: 10_000 },
          { employeeId: "bruno", extraPay: 0 },
        ],
      },
    });
  });

  it("pide fecha y al menos un asistente", () => {
    expect(parseProductionForm(form({ date: "", ids: ["ana"] }), 0)).toEqual({
      success: false,
      error: "Elige la fecha de la jornada.",
    });
    expect(parseProductionForm(form({ ids: [] }), 0)).toEqual({
      success: false,
      error: "Marca quién asistió a la producción.",
    });
  });

  it("excedente inválido", () => {
    expect(parseProductionForm(form({ ids: ["ana"], extras: { ana: "abc" } }), 0)).toEqual({
      success: false,
      error: "Revisa los excedentes.",
      extraErrors: { ana: "Monto inválido" },
    });
  });

  it("total: pago fijo + excedente", () => {
    expect(productionTotal([{ basePay: 50_000, extraPay: 10_000 }, { basePay: 50_000, extraPay: 0 }])).toBe(110_000);
  });
});
