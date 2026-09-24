import { describe, expect, it } from "vitest";
import { checkClose, splitTips, type ClosingRow } from "./closing";
import { currencyOf, formatMoney, fromDecimal, parseMoney, toDecimalString } from "./money";

const row = (name: string, status: ClosingRow["status"] = "WORKED"): ClosingRow => ({
  employeeId: `id-${name}`,
  name,
  status,
});

describe("splitTips", () => {
  it("reparte en partes iguales solo entre quienes trabajaron", () => {
    const shares = splitTips(90_000, [row("Ana"), row("Bruno"), row("Carla", "REST"), row("Dani")]);
    expect(shares.map((s) => [s.name, s.amount])).toEqual([
      ["Ana", 30_000],
      ["Bruno", 30_000],
      ["Dani", 30_000],
    ]);
  });

  it("el sobrante va de 1 en 1 por orden alfabético y la suma cuadra", () => {
    // ejemplo del PRD: 1.000,00 entre 3 → 333,34 / 333,33 / 333,33 (en centavos)
    const shares = splitTips(100_000, [row("Carla"), row("ana"), row("Bruno")]);
    expect(shares.map((s) => [s.name, s.amount])).toEqual([
      ["ana", 33_334],
      ["Bruno", 33_333],
      ["Carla", 33_333],
    ]);
    expect(shares.reduce((a, s) => a + s.amount, 0)).toBe(100_000);
  });

  it("ordena con acentos como en español", () => {
    const names = splitTips(3, [row("Óscar"), row("Pablo"), row("Nelly")]).map((s) => s.name);
    expect(names).toEqual(["Nelly", "Óscar", "Pablo"]);
  });

  it("propina 0 → todos 0; nadie trabajó → vacío", () => {
    expect(splitTips(0, [row("Ana")])).toEqual([{ employeeId: "id-Ana", name: "Ana", amount: 0 }]);
    expect(splitTips(5000, [row("Ana", "ABSENT")])).toEqual([]);
  });
});

describe("checkClose", () => {
  it("no deja cerrar con pendientes", () => {
    const r = checkClose([row("Ana"), row("Bruno", "PENDING")], 0);
    expect(r).toEqual({ ok: false, error: "Falta marcar la asistencia de 1 empleado." });
  });

  it("no deja cerrar con propina si nadie trabajó, pero sí con propina 0", () => {
    expect(checkClose([row("Ana", "REST")], 1000).ok).toBe(false);
    expect(checkClose([row("Ana", "REST")], 0)).toEqual({ ok: true, shares: [] });
  });
});

describe("money (COP)", () => {
  const COP = currencyOf("cop");

  it("COP no usa decimales", () => {
    expect(COP).toEqual({ code: "COP", decimals: 0 });
  });

  it.each([
    ["1250000", 1_250_000],
    ["1.250.000", 1_250_000],
    ["$ 1.250.000", 1_250_000],
    ["1,250,000", 1_250_000],
    ["0", 0],
  ])("parseMoney(%s) = %i", (input, expected) => {
    expect(parseMoney(input, 0)).toBe(expected);
  });

  it.each(["", "abc", "-500", "1.25", "12.50.000", "1250,5", "99999999999"])("rechaza %s", (input) => {
    expect(parseMoney(input, 0)).toBeNull();
  });

  it("formatea en pesos sin decimales", () => {
    expect(formatMoney(1_250_000, COP).replace(/\s/g, " ")).toBe("$ 1.250.000");
  });

  it("convierte a/desde Decimal", () => {
    expect(toDecimalString(1_250_000, 0)).toBe("1250000.00");
    expect(fromDecimal({ toString: () => "1250000.00" }, 0)).toBe(1_250_000);
    expect(fromDecimal(null, 0)).toBeNull();
  });
});

describe("money (con decimales)", () => {
  it.each([
    ["1250.5", 125_050],
    ["1,250.50", 125_050],
    ["1.250,50", 125_050],
    ["1.250", 125_000],
    ["12", 1_200],
  ])("parseMoney(%s, 2) = %i", (input, expected) => {
    expect(parseMoney(input, 2)).toBe(expected);
  });

  it("rechaza más decimales de los permitidos", () => {
    expect(parseMoney("12.345.6789", 2)).toBeNull();
  });
});
