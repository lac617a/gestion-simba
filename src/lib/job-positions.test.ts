import { describe, expect, it } from "vitest";
import { parseJobPositionsForm } from "./job-positions";

/** Filas [id, nombre, pago escrito] como las manda el formulario de Configuración. */
function form(rows: [string, string, string][]) {
  const fd = new FormData();
  for (const [id, name, pay] of rows) {
    fd.append("positionId", id);
    fd.append("positionName", name);
    fd.append("positionPay", pay);
  }
  return fd;
}

const parse = (rows: [string, string, string][]) => parseJobPositionsForm(form(rows), 0);

describe("puestos y pago diario", () => {
  it("lee la lista en orden; los nuevos vienen sin id", () => {
    expect(
      parse([
        ["cocinero", "Cocinero", "80.000"],
        ["mesero", " Mesero ", "60.000"],
        ["", "Bartender", "80000"],
      ])
    ).toEqual({
      success: true,
      data: [
        { id: "cocinero", name: "Cocinero", dailyPay: 80000 },
        { id: "mesero", name: "Mesero", dailyPay: 60000 },
        { id: null, name: "Bartender", dailyPay: 80000 },
      ],
    });
  });

  it("nombres repetidos (sin importar mayúsculas ni tildes)", () => {
    const r = parse([
      ["a", "Jefe de mesa", "70.000"],
      ["", "jefe de  MESA", "70.000"],
    ]);
    expect(r).toEqual({ success: false, error: "“jefe de MESA” está repetido." });
    expect(parse([["a", "Cajero", "1"], ["", "cajéro", "1"]]).success).toBe(false);
  });

  it("nombre y pago obligatorios", () => {
    expect(parse([["", " ", "60.000"]])).toEqual({ success: false, error: "El puesto 1: escribe el nombre del puesto." });
    expect(parse([["", "Mesero", ""]])).toEqual({ success: false, error: "Mesero: escribe el pago diario." });
    expect(parse([["", "Mesero", "0"]]).success).toBe(false);
  });

  it("al menos un puesto", () => {
    expect(parse([])).toEqual({ success: false, error: "Debe haber al menos un puesto." });
  });
});
