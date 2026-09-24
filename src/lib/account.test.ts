import { describe, expect, it } from "vitest";
import { parseAccountForm, parseSettingsForm } from "./account";
import { EMAIL_RULE, IP_RULE, lockedMinutes, registerFailure } from "./throttle";

const MIN = 60_000;
const t0 = new Date("2026-09-24T12:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * MIN);

describe("límite de intentos", () => {
  it("bloquea al 5.º fallo por IP y dura 15 minutos", () => {
    let s = null;
    for (let i = 0; i < 4; i++) s = registerFailure(s, at(i), IP_RULE);
    expect(s).toMatchObject({ failures: 4, lockedUntil: null });
    expect(lockedMinutes(s, at(4))).toBe(0);

    s = registerFailure(s, at(4), IP_RULE);
    expect(s.failures).toBe(5);
    expect(lockedMinutes(s, at(4))).toBe(15);
    expect(lockedMinutes(s, at(18.5))).toBe(1);
    expect(lockedMinutes(s, at(19))).toBe(0);
  });

  it("si la ventana venció, vuelve a contar desde 1", () => {
    let s = registerFailure(null, at(0), IP_RULE);
    s = registerFailure(s, at(3), IP_RULE);
    s = registerFailure(s, at(20), IP_RULE); // 20 min después del primero > ventana de 15
    expect(s).toMatchObject({ failures: 1, firstFailureAt: at(20) });
  });

  it("por correo tolera más fallos antes de bloquear", () => {
    let s = null;
    for (let i = 0; i < 19; i++) s = registerFailure(s, at(i), EMAIL_RULE);
    expect(s!.lockedUntil).toBeNull();
    s = registerFailure(s, at(19), EMAIL_RULE);
    expect(lockedMinutes(s, at(19))).toBe(15);
  });
});

describe("parseAccountForm", () => {
  const form = (v: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, x] of Object.entries({ currentPassword: "", email: "", newPassword: "", confirmPassword: "", ...v })) fd.append(k, x);
    return fd;
  };

  it("cambiar solo el correo (sin contraseña nueva)", () => {
    const r = parseAccountForm(form({ currentPassword: "vieja", email: " Admin@Simba.CO " }));
    expect(r.success && r.data.email).toBe("admin@simba.co");
  });

  it("exige contraseña actual", () => {
    const r = parseAccountForm(form({ email: "a@b.co" }));
    expect(r.error!.issues[0].path).toEqual(["currentPassword"]);
  });

  it("reglas de la contraseña nueva", () => {
    const issues = (np: string, cp = np) =>
      parseAccountForm(form({ currentPassword: "vieja12345", email: "a@b.co", newPassword: np, confirmPassword: cp })).error?.issues.map(
        (i) => i.message
      );
    expect(issues("corta1")).toEqual(["Mínimo 10 caracteres"]);
    expect(issues("solamenteletras")).toEqual(["Debe tener letras y números"]);
    expect(issues("vieja12345")).toEqual(["Debe ser distinta de la actual"]);
    expect(issues("nueva123456", "otra123456")).toEqual(["No coincide con la nueva contraseña"]);
    expect(issues("nueva123456")).toBeUndefined();
  });
});

describe("parseSettingsForm", () => {
  it("normaliza días de cierre y valida", () => {
    const fd = new FormData();
    fd.append("payWeekStart", "1");
    for (const d of ["2", "1", "2"]) fd.append("closedWeekdays", d);
    expect(parseSettingsForm(fd).data).toEqual({ payWeekStart: 1, closedWeekdays: [1, 2] });

    const all = new FormData();
    all.append("payWeekStart", "7");
    for (const d of ["0", "1", "2", "3", "4", "5", "6"]) all.append("closedWeekdays", d);
    expect(parseSettingsForm(all).success).toBe(false);
  });

  it("sin días de cierre también es válido", () => {
    const fd = new FormData();
    fd.append("payWeekStart", "0");
    expect(parseSettingsForm(fd).data).toEqual({ payWeekStart: 0, closedWeekdays: [] });
  });
});
