import { describe, expect, it } from "vitest";
import { formatRestDays, parseEmployeeForm, toDateInputValue } from "./employees";

function form(fields: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

describe("parseEmployeeForm", () => {
  it("acepta solo el nombre y normaliza los opcionales vacíos a null", () => {
    const result = parseEmployeeForm(form({ name: "  Ana López  ", position: "", phone: "", hireDate: "" }));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Ana López",
      position: null,
      phone: null,
      hireDate: null,
      restDays: [],
    });
  });

  it("convierte la fecha de ingreso a medianoche UTC", () => {
    const result = parseEmployeeForm(form({ name: "Ana", hireDate: "2026-03-15" }));
    expect(result.data?.hireDate?.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("ordena y quita duplicados de los días de descanso", () => {
    const result = parseEmployeeForm(form({ name: "Ana", restDays: ["3", "0", "3"] }));
    expect(result.data?.restDays).toEqual([0, 3]);
  });

  it("rechaza nombre corto, teléfono inválido y día fuera de rango", () => {
    const result = parseEmployeeForm(form({ name: "A", phone: "abc", restDays: ["7"] }));
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["name", "phone", "restDays"]));
  });

  it("rechaza descansar los 7 días", () => {
    const result = parseEmployeeForm(form({ name: "Ana", restDays: ["0", "1", "2", "3", "4", "5", "6"] }));
    expect(result.success).toBe(false);
  });
});

describe("helpers", () => {
  it("formatea días de descanso", () => {
    expect(formatRestDays([1, 3])).toBe("Lun, Mié");
    expect(formatRestDays([])).toBe("Sin descanso fijo");
  });

  it("convierte Date a valor de input date", () => {
    expect(toDateInputValue(new Date("2026-03-15T00:00:00Z"))).toBe("2026-03-15");
    expect(toDateInputValue(null)).toBe("");
  });
});
