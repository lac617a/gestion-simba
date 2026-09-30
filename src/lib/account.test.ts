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

const NO_HOURS = ["", "", "", "", "", "", ""];

function settingsForm(fields: {
  payWeekStart?: string;
  payDay?: string;
  hours?: [string, string][];
  whatsapp?: string;
  reminderEmail?: string;
  doubleShift?: string[];
  shifts?: [string, string][];
}) {
  const fd = new FormData();
  for (const d of fields.doubleShift ?? ["0", "6"]) fd.append("doubleShiftWeekdays", d);
  (fields.shifts ?? [["11:00", "16:00"], ["17:30", "23:30"]]).forEach(([open, close], i) => {
    fd.append(`shiftOpen${i}`, open);
    fd.append(`shiftClose${i}`, close);
  });
  fd.append("whatsapp", fields.whatsapp ?? "301 216 8273");
  fd.append("reminderEmail", fields.reminderEmail ?? "simbaparrilla1@gmail.com");
  fd.append("payWeekStart", fields.payWeekStart ?? "1");
  fd.append("payDay", fields.payDay ?? "1");
  (fields.hours ?? []).forEach(([open, close], i) => {
    fd.append(`open${i}`, open);
    fd.append(`close${i}`, close);
  });
  return fd;
}

describe("parseSettingsForm", () => {
  it("ajustes válidos", () => {
    expect(parseSettingsForm(settingsForm({})).data).toEqual({
      payWeekStart: 1,
      payDay: 1,
      openingHours: NO_HOURS,
      whatsapp: "301 216 8273",
      reminderEmail: "simbaparrilla1@gmail.com",
      doubleShiftWeekdays: [0, 6],
      shiftHours: ["11:00-16:00", "17:30-23:30"],
    });
    expect(parseSettingsForm(settingsForm({ payWeekStart: "0", payDay: "0" })).data).toMatchObject({
      payWeekStart: 0,
      payDay: 0,
    });
  });

  it("inicio de semana inválido", () => {
    expect(parseSettingsForm(settingsForm({ payWeekStart: "7" })).success).toBe(false);
  });

  it("WhatsApp del restaurante", () => {
    expect(parseSettingsForm(settingsForm({ whatsapp: " +57 301 216 8273 " })).data?.whatsapp).toBe("+57 301 216 8273");
    expect(parseSettingsForm(settingsForm({ whatsapp: "4441234" })).success).toBe(false);
    expect(parseSettingsForm(settingsForm({ whatsapp: "" })).success).toBe(false);
  });

  it("correo de recordatorios: vacío lo desactiva, se normaliza, debe ser válido", () => {
    expect(parseSettingsForm(settingsForm({ reminderEmail: "" })).data?.reminderEmail).toBe("");
    expect(parseSettingsForm(settingsForm({ reminderEmail: " Simba@Gmail.com " })).data?.reminderEmail).toBe("simba@gmail.com");
    expect(parseSettingsForm(settingsForm({ reminderEmail: "no-es-correo" })).error?.issues[0].message).toBe(
      "Correo de recordatorios inválido"
    );
  });

  it("doble turno: días y horario de cada turno", () => {
    expect(parseSettingsForm(settingsForm({ doubleShift: ["6", "0", "6"] })).data?.doubleShiftWeekdays).toEqual([0, 6]);
    expect(parseSettingsForm(settingsForm({ doubleShift: [] })).data?.doubleShiftWeekdays).toEqual([]);
    const error = (shifts: [string, string][]) => parseSettingsForm(settingsForm({ shifts })).error?.issues[0].message;
    expect(error([["11:00", ""], ["17:30", "23:30"]])).toBe("Turno de la mañana: escribe la hora de inicio y de fin.");
    expect(error([["11:00", "16:00"], ["23:30", "17:30"]])).toBe("Turno de la tarde: la hora de fin debe ser después de la de inicio.");
    expect(error([["11:00", "18:00"], ["17:30", "23:30"]])).toBe(
      "El turno de la tarde debe empezar después de que termine el de la mañana."
    );
  });

  it("día de pago inválido", () => {
    expect(parseSettingsForm(settingsForm({ payDay: "8" })).success).toBe(false);
  });

  it("horario: guarda los días llenos, vacío = sin horario", () => {
    const hours: [string, string][] = [["12:00", "17:00"], ["", ""], ["12:00", "22:00"], ["", ""], ["", ""], ["", ""], ["11:00", "23:30"]];
    expect(parseSettingsForm(settingsForm({ hours })).data?.openingHours).toEqual([
      "12:00-17:00", "", "12:00-22:00", "", "", "", "11:00-23:30",
    ]);
  });

  it("horario: falta una hora o cierra antes de abrir", () => {
    const row = (i: number, open: string, close: string) =>
      Array.from({ length: 7 }, (_, j): [string, string] => (j === i ? [open, close] : ["", ""]));
    const error = (hours: [string, string][]) => parseSettingsForm(settingsForm({ hours })).error?.issues[0].message;

    expect(error(row(2, "12:00", ""))).toBe("Martes: falta la hora de cierre.");
    expect(error(row(0, "", "18:00"))).toBe("Domingo: falta la hora de apertura.");
    expect(error(row(6, "22:00", "12:00"))).toBe("Sábado: la hora de cierre debe ser después de la de apertura.");
    expect(error(row(6, "12:00", "12:00"))).toBe("Sábado: la hora de cierre debe ser después de la de apertura.");
    expect(error(row(6, "12:00", "25:00"))).toBe("Hora inválida");
  });
});
