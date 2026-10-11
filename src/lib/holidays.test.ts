import { describe, expect, it } from "vitest";
import { colombianHolidays, easterSunday, holidayOn, isMondayHoliday, mondayHolidays } from "./holidays";

describe("festivos de Colombia", () => {
  it("domingo de Pascua", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("los 18 festivos del año, con los trasladados al lunes", () => {
    const y = colombianHolidays(2026);
    expect(y).toHaveLength(18);
    expect(holidayOn("2026-01-01")).toBe("Año Nuevo");
    expect(holidayOn("2026-01-12")).toBe("Día de los Reyes Magos"); // 6 de enero, martes → lunes 12
    expect(holidayOn("2026-04-02")).toBe("Jueves Santo");
    expect(holidayOn("2026-05-18")).toBe("Ascensión del Señor");
    expect(holidayOn("2026-10-12")).toBe("Día de la Raza");
    expect(holidayOn("2026-11-02")).toBe("Todos los Santos"); // 1 de noviembre, domingo → lunes 2
    expect(holidayOn("2026-11-16")).toBe("Independencia de Cartagena");
    expect(holidayOn("2026-10-05")).toBeNull();
  });

  it("dos festivos el mismo lunes se unen", () => {
    // 2025: Sagrado Corazón y San Pedro y San Pablo caen el lunes 30 de junio
    expect(holidayOn("2025-06-30")).toBe("San Pedro y San Pablo y Sagrado Corazón");
  });

  it("lunes festivos: los trasladados y los de fecha fija que caen en lunes", () => {
    expect(isMondayHoliday("2026-10-12")).toBe(true);
    expect(isMondayHoliday("2026-07-20")).toBe(true); // 20 de julio de 2026 es lunes
    expect(isMondayHoliday("2026-12-08")).toBe(false); // festivo, pero martes
    expect(isMondayHoliday("2026-10-19")).toBe(false); // lunes normal
    expect(mondayHolidays("2026-10-11", "2027-01-31")).toEqual([
      { date: "2026-10-12", name: "Día de la Raza" },
      { date: "2026-11-02", name: "Todos los Santos" },
      { date: "2026-11-16", name: "Independencia de Cartagena" },
      { date: "2027-01-11", name: "Día de los Reyes Magos" },
    ]);
  });
});
