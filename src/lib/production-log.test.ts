import { describe, expect, it } from "vitest";
import {
  beforeHistory,
  describeProductionLog,
  diffProduction,
  productionSnapshot,
  type ProductionLogEntry,
  type ProductionSnapshot,
} from "./production-log";

const money = (v: number) => `$${v}`;
const ana = { employeeId: "a", name: "Ana", basePay: 50, extraPay: 0 };
const bruno = { employeeId: "b", name: "Bruno", basePay: 50, extraPay: 10 };
const ines = { employeeId: "i", name: "Inés", basePay: 60, extraPay: 0 };
const day: ProductionSnapshot = { date: "2026-10-01", note: null, attendees: [ana, bruno] };

const entry = (e: Partial<ProductionLogEntry>): ProductionLogEntry => ({
  id: "x",
  action: "UPDATED",
  dayId: "d",
  date: "2026-10-01",
  before: null,
  after: null,
  at: new Date(),
  user: "Laura",
  ...e,
});

describe("historial de producción", () => {
  it("el snapshot ordena por nombre, quita el puesto y guarda la nota vacía como null", () => {
    expect(
      productionSnapshot({
        date: "2026-10-01",
        note: "",
        attendees: [{ ...bruno, position: "Cocina" } as typeof bruno, ana],
      })
    ).toEqual({ date: "2026-10-01", note: null, attendees: [ana, bruno] });
  });

  it("sin cambios no hay nada que anotar", () => {
    expect(diffProduction(day, { ...day, note: "", attendees: [bruno, ana] })).toEqual([]);
  });

  it("detecta fecha, quién entró o salió, excedentes y nota", () => {
    const after: ProductionSnapshot = {
      date: "2026-10-02",
      note: "Salsas",
      attendees: [{ ...ana, extraPay: 20 }, ines],
    };
    expect(diffProduction(day, after)).toEqual([
      { kind: "date", from: "2026-10-01", to: "2026-10-02" },
      { kind: "added", attendees: [ines] },
      { kind: "removed", attendees: [bruno] },
      { kind: "extra", name: "Ana", from: 0, to: 20 },
      { kind: "note", from: null, to: "Salsas" },
    ]);
  });

  it("al editar: cada cambio en una línea y el total si cambió", () => {
    const after: ProductionSnapshot = { ...day, attendees: [{ ...ana, extraPay: 20 }, bruno, ines] };
    expect(describeProductionLog(entry({ before: day, after }), money)).toEqual({
      title: "Editó la jornada",
      details: ["Agregó a Inés", "Excedente de Ana: $0 → $20", "Total: $110 → $190"],
    });
    // Solo la nota: el total no cambia
    expect(describeProductionLog(entry({ before: day, after: { ...day, note: "Carnes" } }), money).details).toEqual([
      "Nota: (vacía) → Carnes",
    ]);
  });

  it("al registrar y al eliminar: quiénes (con excedente), total y nota", () => {
    const snap = { ...day, note: "Salsas", attendees: [ana, bruno, ines] };
    const lines = ["3 asistentes: Ana, Bruno (+$10) e Inés", "Total: $170", "Nota: Salsas"];
    expect(describeProductionLog(entry({ action: "CREATED", after: snap }), money)).toEqual({
      title: "Registró la jornada",
      details: lines,
    });
    expect(describeProductionLog(entry({ action: "DELETED", before: snap, dayId: null }), money)).toEqual({
      title: "Eliminó la jornada",
      details: lines,
    });
  });

  it("las registradas antes del historial no tienen detalle", () => {
    const old = entry({ action: "CREATED", user: null });
    expect(describeProductionLog(old, money)).toEqual({ title: "Registró la jornada", details: [] });
    expect(beforeHistory(old)).toBe(true);
    expect(beforeHistory(entry({ action: "CREATED", after: day }))).toBe(false);
  });
});
