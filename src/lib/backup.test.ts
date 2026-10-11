import { describe, expect, it } from "vitest";
import { backupFileName, loadOrder, NO_PASSWORD, parseBackup, restoreRows, scrubRows, totalRows } from "./backup";

describe("respaldo", () => {
  it("orden de carga: primero las tablas referenciadas", () => {
    const order = loadOrder(
      ["TipShare", "Attendance", "Employee", "WorkDay", "JobPosition", "Review"],
      [
        { table: "Attendance", references: "WorkDay" },
        { table: "Attendance", references: "Employee" },
        { table: "TipShare", references: "WorkDay" },
        { table: "TipShare", references: "Employee" },
        { table: "Employee", references: "JobPosition" },
        // Una referencia a una tabla que no va en el respaldo no cuenta
        { table: "Employee", references: "_prisma_migrations" },
      ]
    );
    expect(order).toEqual(["JobPosition", "Review", "WorkDay", "Employee", "Attendance", "TipShare"]);
    const before = (a: string, b: string) => order.indexOf(a) < order.indexOf(b);
    expect(before("Employee", "Attendance") && before("WorkDay", "TipShare") && before("JobPosition", "Employee")).toBe(true);
  });

  it("avisa si las tablas se referencian en círculo", () => {
    expect(() =>
      loadOrder(["A", "B"], [
        { table: "A", references: "B" },
        { table: "B", references: "A" },
      ])
    ).toThrow(/círculo/);
  });

  it("las contraseñas no salen de la base y al restaurar quedan sin valor que sirva", () => {
    const users = [{ id: "u1", email: "ana@simba.co", passwordHash: "$2a$10$secreto" }];
    const out = scrubRows("User", users);
    expect(out).toEqual([{ id: "u1", email: "ana@simba.co", passwordHash: null }]);
    expect(users[0].passwordHash).toBe("$2a$10$secreto"); // no cambia lo original
    expect(restoreRows("User", out)).toEqual([{ id: "u1", email: "ana@simba.co", passwordHash: NO_PASSWORD }]);
    // Las demás tablas pasan igual
    const employees = [{ id: "e1", name: "Ana" }];
    expect(scrubRows("Employee", employees)).toBe(employees);
    expect(restoreRows("Employee", employees)).toBe(employees);
  });

  it("nombre del archivo, total de filas y validación al leerlo", () => {
    expect(backupFileName("2026-10-12")).toBe("respaldo-simba-2026-10-12.json.gz");
    const backup = {
      version: 1,
      createdAt: "2026-10-12T12:00:00.000Z",
      tables: [
        { name: "Employee", rows: [{ id: "e1" }, { id: "e2" }] },
        { name: "Review", rows: [] },
      ],
    };
    expect(totalRows(backup)).toBe(2);
    expect(parseBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
    expect(() => parseBackup({ hola: 1 })).toThrow(/no es un respaldo/);
    expect(() => parseBackup({ ...backup, version: 99 })).toThrow(/versión 99/);
    expect(() => parseBackup({ ...backup, tables: [{ name: "Employee" }] })).toThrow(/incompleto/);
  });
});
