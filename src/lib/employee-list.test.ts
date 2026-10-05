import { describe, expect, it } from "vitest";
import { groupByPosition, positionSlug, todayLabel, todayStatus, weekCounts } from "./employee-list";

const base = {
  today: "2026-10-03", // sábado
  hireDate: "2026-08-01",
  restDays: [] as number[],
  timeOff: [],
  marked: null,
  closedToday: false,
};
const fmt = (iso: string) => iso.slice(5);

describe("cómo está hoy", () => {
  it("lo marcado en la asistencia manda", () => {
    expect(todayStatus({ ...base, marked: "WORKED", restDays: [6] })).toEqual({ kind: "status", status: "WORKED", until: null });
    expect(todayStatus({ ...base, marked: "ABSENT" })).toMatchObject({ status: "ABSENT" });
  });

  it("sin marcar: lo previsto (descanso fijo, días libres) o pendiente", () => {
    expect(todayStatus({ ...base, restDays: [6] })).toEqual({ kind: "status", status: "REST", until: null });
    expect(todayStatus(base)).toEqual({ kind: "status", status: "PENDING", until: null });
  });

  it("vacaciones o permiso: hasta cuándo, si sigue después de hoy", () => {
    const leave = { type: "LEAVE" as const, startDate: "2026-10-01", endDate: "2026-10-22" };
    expect(todayStatus({ ...base, timeOff: [leave] })).toEqual({ kind: "status", status: "LEAVE", until: "2026-10-22" });
    // Marcado a mano como vacaciones (con el rango asignado igual se sabe hasta cuándo)
    expect(todayStatus({ ...base, marked: "LEAVE", timeOff: [leave] })).toMatchObject({ until: "2026-10-22" });
    // Termina hoy
    expect(todayStatus({ ...base, timeOff: [{ ...leave, endDate: "2026-10-03" }] })).toMatchObject({ status: "LEAVE", until: null });
    // Un permiso no da "hasta" a unas vacaciones marcadas a mano
    const permiso = { type: "EXTRA_REST" as const, startDate: "2026-10-03", endDate: "2026-10-05" };
    expect(todayStatus({ ...base, marked: "LEAVE", timeOff: [permiso] })).toMatchObject({ status: "LEAVE", until: null });
  });

  it("día cerrado y empleados que todavía no ingresan", () => {
    expect(todayStatus({ ...base, closedToday: true, marked: "WORKED" })).toEqual({ kind: "closed" });
    expect(todayStatus({ ...base, hireDate: "2026-10-10" })).toEqual({ kind: "not-hired", from: "2026-10-10" });
  });

  it("textos", () => {
    expect(todayLabel({ kind: "status", status: "WORKED", until: null }, fmt)).toBe("Trabaja hoy");
    expect(todayLabel({ kind: "status", status: "PENDING", until: null }, fmt)).toBe("Sin marcar hoy");
    expect(todayLabel({ kind: "status", status: "LEAVE", until: "2026-10-22" }, fmt)).toBe("Vacaciones hasta el 10-22");
    expect(todayLabel({ kind: "status", status: "EXTRA_REST", until: null }, fmt)).toBe("Permiso hoy");
    expect(todayLabel({ kind: "not-hired", from: "2026-10-10" }, fmt)).toBe("Ingresa el 10-10");
    expect(todayLabel({ kind: "closed" }, fmt)).toBeNull();
  });
});

describe("semana de pago", () => {
  it("días trabajados y faltas de cada empleado, solo dentro de la semana", () => {
    // Trabajó del lunes 28 de septiembre al domingo 4 de octubre
    const week = { from: "2026-09-28", to: "2026-10-04" };
    const days = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
    const marks = [
      ...days.map((date) => ({ employeeId: "daniela", date, status: "WORKED" as const })),
      { employeeId: "daniela", date: "2026-10-05", status: "WORKED" as const }, // ya es la semana siguiente
      { employeeId: "bruno", date: "2026-09-30", status: "ABSENT" as const },
      { employeeId: "bruno", date: "2026-10-01", status: "REST" as const }, // no cuenta
    ];
    const counts = weekCounts(marks, week);
    expect(counts.get("daniela")).toEqual({ worked: 7, absent: 0 });
    expect(counts.get("bruno")).toEqual({ worked: 0, absent: 1 });
    expect(counts.has("ana")).toBe(false);
  });
});

describe("puestos", () => {
  it("slug para la dirección", () => {
    expect(positionSlug("Jefe de mesa")).toBe("jefe-de-mesa");
    expect(positionSlug("Cocinero")).toBe("cocinero");
    expect(positionSlug("Auxiliar de cocina / Ñoño")).toBe("auxiliar-de-cocina-nono");
  });

  it("grupos en orden alfabético y sin puesto al final", () => {
    const rows = [
      { name: "Ana", position: "Mesero" },
      { name: "Luis", position: null },
      { name: "Betty", position: "Cocinero" },
      { name: "Bruno", position: "Mesero" },
    ];
    expect(groupByPosition(rows).map(([g, list]) => [g, list.map((r) => r.name)])).toEqual([
      ["Cocinero", ["Betty"]],
      ["Mesero", ["Ana", "Bruno"]],
      ["Sin puesto", ["Luis"]],
    ]);
  });
});
