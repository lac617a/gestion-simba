import { describe, expect, it } from "vitest";
import { colombianHolidays, easterSunday, holidayOn, nextHoliday } from "./holidays";
import { daySchedule, scheduleLabel } from "./schedule";

describe("festivos de Colombia", () => {
  it("Pascua", () => {
    expect(easterSunday(2024)).toBe("2024-03-31");
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("calendario oficial 2026 (18 festivos)", () => {
    expect(colombianHolidays(2026).map((h) => h.date)).toEqual([
      "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01",
      "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07",
      "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
    ]);
  });

  it("calendario 2025 (festivos trasladados)", () => {
    const dates = colombianHolidays(2025).map((h) => h.date);
    expect(dates).toContain("2025-01-06"); // Reyes cae lunes
    expect(dates).toContain("2025-03-24"); // San José
    expect(dates).toContain("2025-04-17"); // Jueves Santo
    expect(dates).toContain("2025-06-02"); // Ascensión
    expect(dates).toContain("2025-06-23"); // Corpus
    expect(dates).toContain("2025-06-30"); // Sagrado Corazón y San Pedro (misma semana)
    expect(dates).toHaveLength(18);
  });

  it("holidayOn y nextHoliday", () => {
    expect(holidayOn("2026-10-12")).toBe("Día de la Raza");
    expect(holidayOn("2026-10-13")).toBeNull();
    expect(holidayOn("2025-06-30")).toBe("San Pedro y San Pablo y Sagrado Corazón");
    expect(nextHoliday("2026-09-24")).toEqual({ date: "2026-10-12", name: "Día de la Raza" });
    expect(nextHoliday("2026-12-26")).toEqual({ date: "2027-01-01", name: "Año Nuevo" });
  });
});

describe("daySchedule (cierra los lunes)", () => {
  const MON = [1];

  it("lunes normal: cerrado", () => {
    expect(daySchedule("2026-09-28", MON)).toMatchObject({ open: false, reason: "closed-weekday" });
  });

  it("lunes festivo: abre; el martes siguiente cierra", () => {
    expect(daySchedule("2026-10-12", MON)).toMatchObject({ open: true, reason: "holiday-open", holiday: "Día de la Raza" });
    expect(daySchedule("2026-10-13", MON)).toMatchObject({
      open: false,
      reason: "after-holiday",
      previousHoliday: "Día de la Raza",
    });
  });

  it("martes normal y festivo entre semana: abre", () => {
    expect(daySchedule("2026-09-29", MON)).toMatchObject({ open: true, reason: "normal" });
    expect(daySchedule("2026-04-02", MON)).toMatchObject({ open: true, reason: "normal", holiday: "Jueves Santo" });
  });

  it("la excepción manual manda", () => {
    expect(daySchedule("2026-09-28", MON, true)).toMatchObject({ open: true, reason: "override-open" });
    expect(daySchedule("2026-12-25", MON, false)).toMatchObject({ open: false, reason: "override-closed" });
  });

  it("sin días de cierre configurados, siempre abre", () => {
    expect(daySchedule("2026-09-28", [])).toMatchObject({ open: true, reason: "normal" });
    expect(daySchedule("2026-10-13", [])).toMatchObject({ open: true, reason: "normal" });
  });

  it("etiquetas", () => {
    expect(scheduleLabel(daySchedule("2026-09-28", MON))).toBe("El restaurante cierra los lunes.");
    expect(scheduleLabel(daySchedule("2026-10-13", MON))).toContain("Día de la Raza");
    expect(scheduleLabel(daySchedule("2026-09-29", MON))).toBe("");
  });
});
