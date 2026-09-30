import { describe, expect, it } from "vitest";
import { displayName, homeFor, parseUserForm } from "./users";

const form = (v: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, val] of Object.entries(v)) fd.set(k, val);
  return fd;
};
const base = { name: " Laura ", email: " Laura@Correo.com ", role: "RESERVATIONS", password: "", confirmPassword: "" };

describe("parseUserForm", () => {
  it("al crear, la contraseña es obligatoria", () => {
    const r = parseUserForm(form(base), "new");
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(["password"]);
  });

  it("al editar, contraseña vacía = no se cambia; limpia nombre y correo", () => {
    const r = parseUserForm(form(base), "edit");
    expect(r.success && r.data).toEqual({
      name: "Laura",
      email: "laura@correo.com",
      role: "RESERVATIONS",
      password: "",
      confirmPassword: "",
    });
  });

  it("aplica las reglas de contraseña y la confirmación", () => {
    const short = parseUserForm(form({ ...base, password: "abc123", confirmPassword: "abc123" }), "new");
    expect(short.error?.issues[0].message).toMatch(/Mínimo/);
    const noDigits = parseUserForm(form({ ...base, password: "solamenteletras", confirmPassword: "solamenteletras" }), "new");
    expect(noDigits.error?.issues[0].message).toBe("Debe tener letras y números");
    const mismatch = parseUserForm(form({ ...base, password: "reservas2026", confirmPassword: "reservas2025" }), "new");
    expect(mismatch.error?.issues.map((i) => i.path[0])).toEqual(["confirmPassword"]);
    expect(parseUserForm(form({ ...base, password: "reservas2026", confirmPassword: "reservas2026" }), "new").success).toBe(true);
  });

  it("rechaza roles desconocidos y nombres vacíos", () => {
    const r = parseUserForm(form({ ...base, role: "SUPERADMIN", name: " " }), "edit");
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(["name", "role"]);
  });
});

describe("roles", () => {
  it("cada rol entra a su pantalla", () => {
    expect(homeFor("ADMIN")).toBe("/gestion");
    expect(homeFor("RESERVATIONS")).toBe("/gestion/reservas");
  });

  it("sin nombre se muestra el correo", () => {
    expect(displayName({ name: null, email: "admin@simba.local" })).toBe("admin@simba.local");
    expect(displayName({ name: "Laura", email: "l@x.co" })).toBe("Laura");
  });
});
