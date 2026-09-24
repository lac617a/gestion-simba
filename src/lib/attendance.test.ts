import { describe, expect, it } from "vitest";
import { countByStatus, initialStatus, parseTimeOffForm, type TimeOffRange } from "./attendance";
import { addDays, formatDateRange, isISODate, todayISO, weekdayOf } from "./dates";

describe("dates", () => {
  it("todayISO usa la zona del restaurante", () => {
    // 2026-09-24 03:30 UTC = 2026-09-23 22:30 en Bogotá (UTC-5)
    const now = new Date("2026-09-24T03:30:00Z");
    expect(todayISO("America/Bogota", 0, now)).toBe("2026-09-23");
    expect(todayISO("UTC", 0, now)).toBe("2026-09-24");
  });

  it("todayISO respeta la hora de corte", () => {
    // 02:00 en Bogotá con corte a las 4 → sigue siendo el día anterior
    const now = new Date("2026-09-24T07:00:00Z");
    expect(todayISO("America/Bogota", 0, now)).toBe("2026-09-24");
    expect(todayISO("America/Bogota", 4, now)).toBe("2026-09-23");
  });

  it("addDays cruza meses y años", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("formatDateRange compacta el mismo mes", () => {
    expect(formatDateRange("2026-09-21", "2026-09-27")).toBe("21 a 27 de sept de 2026");
    expect(formatDateRange("2026-09-28", "2026-10-04")).toContain("oct");
  });

  it("weekdayOf e isISODate", () => {
    expect(weekdayOf("2026-09-23")).toBe(3); // miércoles
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("23/09/2026")).toBe(false);
  });
});

describe("initialStatus", () => {
  const wednesday = "2026-09-23";
  const vacation: TimeOffRange = { type: "LEAVE", startDate: "2026-09-20", endDate: "2026-09-25" };
  const permiso: TimeOffRange = { type: "EXTRA_REST", startDate: wednesday, endDate: wednesday };

  it("pendiente si no descansa ni tiene días libres", () => {
    expect(initialStatus([1], wednesday, [])).toBe("PENDING");
  });

  it("descanso fijo si coincide el día de la semana", () => {
    expect(initialStatus([3], wednesday, [])).toBe("REST");
  });

  it("el día libre asignado gana al descanso fijo", () => {
    expect(initialStatus([3], wednesday, [permiso])).toBe("EXTRA_REST");
  });

  it("vacaciones ganan a permiso si se solapan", () => {
    expect(initialStatus([], wednesday, [permiso, vacation])).toBe("LEAVE");
  });

  it("los rangos son inclusivos y no aplican fuera", () => {
    expect(initialStatus([], "2026-09-25", [vacation])).toBe("LEAVE");
    expect(initialStatus([], "2026-09-26", [vacation])).toBe("PENDING");
  });
});

describe("countByStatus", () => {
  it("cuenta cada estado", () => {
    const c = countByStatus(["WORKED", "WORKED", "REST", "PENDING"]);
    expect(c).toMatchObject({ WORKED: 2, REST: 1, PENDING: 1, ABSENT: 0 });
  });
});

describe("parseTimeOffForm", () => {
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fd;
  };

  it("usa la fecha de inicio si no hay fecha fin", () => {
    const r = parseTimeOffForm(form({ type: "EXTRA_REST", startDate: "2026-10-01", note: "" }));
    expect(r.data).toEqual({ type: "EXTRA_REST", startDate: "2026-10-01", endDate: "2026-10-01", note: null });
  });

  it("rechaza fin antes de inicio", () => {
    const r = parseTimeOffForm(form({ type: "LEAVE", startDate: "2026-10-05", endDate: "2026-10-01" }));
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(["endDate"]);
  });

  it("rechaza rangos de 90 días o más y tipos inválidos", () => {
    expect(parseTimeOffForm(form({ type: "LEAVE", startDate: "2026-01-01", endDate: "2026-04-01" })).success).toBe(false);
    expect(parseTimeOffForm(form({ type: "WORKED", startDate: "2026-01-01" })).success).toBe(false);
  });
});
