import { describe, expect, it } from "vitest";
import { daySchedule, scheduleLabel } from "./schedule";

describe("daySchedule (abre de lunes a domingo)", () => {
  it("abre todos los días", () => {
    for (const date of ["2026-09-28", "2026-10-12", "2026-10-13", "2026-12-25"]) {
      expect(daySchedule(date)).toEqual({ date, open: true, reason: "normal" });
    }
  });

  it("solo cierra un día marcado a mano", () => {
    expect(daySchedule("2026-12-25", false)).toMatchObject({ open: false, reason: "override-closed" });
  });

  it("las excepciones viejas de 'abrir' ya no cambian nada", () => {
    expect(daySchedule("2026-09-28", true)).toMatchObject({ open: true, reason: "normal" });
  });

  it("etiquetas", () => {
    expect(scheduleLabel(daySchedule("2026-12-25", false))).toBe("Cerrado por excepción.");
    expect(scheduleLabel(daySchedule("2026-10-12"))).toBe("");
  });
});
