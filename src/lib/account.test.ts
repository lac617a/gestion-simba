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

const NO_HOURS = ["", "", "", "", "", "", "", ""];

function settingsForm(fields: { payWeekStart?: string; payDay?: string; closed?: string[]; hours?: [string, string][] }) {
  const fd = new FormData();
  fd.append("payWeekStart", fields.payWeekStart ?? "1");
  fd.append("payDay", fields.payDay ?? "1");
  for (const d of fields.closed ?? []) fd.append("closedWeekdays", d);
  (fields.hours ?? []).forEach(([open, close], i) => {
    fd.append(`open${i}`, open);
    fd.append(`close${i}`, close);
  });
  return fd;
}

describe("parseSettingsForm", () => {
  it("normaliza días de cierre y valida", () => {
    expect(parseSettingsForm(settingsForm({ closed: ["2", "1", "2"] })).data).toEqual({
      payWeekStart: 1,
      payDay: 1,
      closedWeekdays: [1, 2],
      openingHours: NO_HOURS,
    });
    const all = settingsForm({ payWeekStart: "7", closed: ["0", "1", "2", "3", "4", "5", "6"] });
    expect(parseSettingsForm(all).success).toBe(false);
  });

  it("sin días de cierre también es válido", () => {
    expect(parseSettingsForm(settingsForm({ payWeekStart: "0", payDay: "0" })).data).toEqual({
      payWeekStart: 0,
      payDay: 0,
      closedWeekdays: [],
      openingHours: NO_HOURS,
    });
  });

  it("día de pago inválido", () => {
    expect(parseSettingsForm(settingsForm({ payDay: "8" })).success).toBe(false);
  });

  it("horario: guarda los días llenos, vacío = sin horario", () => {
    const hours: [string, string][] = [["12:00", "17:00"], ["", ""], ["12:00", "22:00"], ["", ""], ["", ""], ["", ""], ["", ""], ["12:00", "18:00"]];
    expect(parseSettingsForm(settingsForm({ hours })).data?.openingHours).toEqual([
      "12:00-17:00", "", "12:00-22:00", "", "", "", "", "12:00-18:00",
    ]);
  });

  it("horario: falta una hora o cierra antes de abrir", () => {
    const row = (i: number, open: string, close: string) =>
      Array.from({ length: 8 }, (_, j): [string, string] => (j === i ? [open, close] : ["", ""]));
    const error = (hours: [string, string][]) => parseSettingsForm(settingsForm({ hours })).error?.issues[0].message;

    expect(error(row(2, "12:00", ""))).toBe("Martes: falta la hora de cierre.");
    expect(error(row(7, "", "18:00"))).toBe("Festivos: falta la hora de apertura.");
    expect(error(row(6, "22:00", "12:00"))).toBe("Sábado: la hora de cierre debe ser después de la de apertura.");
    expect(error(row(6, "12:00", "12:00"))).toBe("Sábado: la hora de cierre debe ser después de la de apertura.");
    expect(error(row(6, "12:00", "25:00"))).toBe("Hora inválida");
  });
});
