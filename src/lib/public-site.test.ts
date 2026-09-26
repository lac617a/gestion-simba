import { describe, expect, it } from "vitest";
import { MENU } from "./menu";
import { formatPesos, holidayHours, orderMessage, reservationRequestMessage, weeklyHours } from "./public-site";

const norm = (s: string | null) => s?.replace(/\s/g, " ") ?? null; // Intl usa espacios finos

describe("horario de la semana", () => {
  // domingo 12–17, lunes vacío (cierra), martes a sábado 12–22, festivos 12–18
  const HOURS = ["12:00-17:00", "", "12:00-22:00", "12:00-22:00", "12:00-22:00", "12:00-22:00", "12:00-22:00", "12:00-18:00"];

  it("agrupa días seguidos iguales, empezando el lunes", () => {
    expect(weeklyHours(HOURS, [1]).map((r) => ({ ...r, hours: norm(r.hours) }))).toEqual([
      { days: "Lunes", hours: null, closed: true },
      { days: "Martes a sábado", hours: "12:00 p. m. a 10:00 p. m.", closed: false },
      { days: "Domingo", hours: "12:00 p. m. a 5:00 p. m.", closed: false },
    ]);
  });

  it("dos días seguidos van con 'y'; sin horario configurado queda null", () => {
    const hours = ["", "", "12:00-22:00", "12:00-22:00", "11:00-23:00", "11:00-23:00", "11:00-23:00"];
    expect(weeklyHours(hours, [1]).map((r) => r.days)).toEqual(["Lunes", "Martes y miércoles", "Jueves a sábado", "Domingo"]);
    expect(weeklyHours(hours, [1]).at(-1)).toEqual({ days: "Domingo", hours: null, closed: false });
  });

  it("horario de festivos", () => {
    expect(norm(holidayHours(HOURS))).toBe("12:00 p. m. a 6:00 p. m.");
    expect(holidayHours([])).toBeNull();
  });
});

describe("mensajes de WhatsApp de la página pública", () => {
  it("reserva con ocasión y nota", () => {
    const msg = reservationRequestMessage(
      {
        name: " Laura Gómez ",
        date: "2026-10-03",
        time: "19:30",
        people: 4,
        occasion: "Cumpleaños",
        honoree: "Sofía",
        note: "Traemos torta",
      },
      "Simba",
      "7:30 p. m."
    );
    expect(msg.split("\n")).toEqual([
      "Hola Simba 👋 Quiero hacer una reserva:",
      "",
      "👤 A nombre de: Laura Gómez",
      "📅 Sábado, 3 de octubre",
      "🕖 7:30 p. m.",
      "👥 4 personas",
      "🎉 Cumpleaños de Sofía",
      "📝 Traemos torta",
      "",
      "¿Me confirman, por favor?",
    ]);
  });

  it("sin ocasión ni nota, 1 persona", () => {
    const msg = reservationRequestMessage(
      { name: "Ana", date: "2026-10-03", time: "13:00", people: 1, occasion: "", honoree: "Pepe", note: " " },
      "Simba",
      "1:00 p. m."
    );
    expect(msg).toContain("👥 1 persona\n");
    expect(msg).not.toContain("🎉");
    expect(msg).not.toContain("📝");
  });

  it("pedido", () => {
    expect(orderMessage("Simba")).toBe("Hola Simba 👋 Quiero hacer un pedido.");
  });
});

describe("menú", () => {
  it("precios con punto de miles", () => {
    expect(formatPesos(3000)).toBe("3.000");
    expect(formatPesos(26000)).toBe("26.000");
    expect(formatPesos(270000)).toBe("270.000");
  });

  it("secciones con id único y precios válidos", () => {
    const ids = MENU.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const items = MENU.flatMap((s) => [...s.items, ...(s.groups?.flatMap((g) => g.items) ?? [])]);
    expect(items.length).toBeGreaterThan(60);
    for (const item of items) expect(item.price, item.name).toBeGreaterThanOrEqual(1000);
  });
});
