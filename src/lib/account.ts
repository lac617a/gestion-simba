import * as z from "zod";
import { whatsappNumber } from "@/lib/reservations";

export const MIN_PASSWORD = 10;

/** Reglas de una contraseña nueva; null si cumple. */
export function passwordIssue(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Mínimo ${MIN_PASSWORD} caracteres`;
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Debe tener letras y números";
  return null;
}

/** Cambio de correo y/o contraseña. Siempre pide la contraseña actual. */
export const AccountSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Escribe tu contraseña actual" }),
    // trim antes de validar: el teclado del celular suele dejar un espacio al final
    email: z.string().trim().toLowerCase().pipe(z.email({ error: "Correo inválido" })),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword === "") return; // no cambia la contraseña
    const issue = passwordIssue(v.newPassword);
    if (issue) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: issue });
    } else if (v.newPassword === v.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Debe ser distinta de la actual" });
    }
    if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "No coincide con la nueva contraseña" });
    }
  });

export type AccountFieldErrors = Partial<Record<"currentPassword" | "email" | "newPassword" | "confirmPassword", string[]>>;

export function parseAccountForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return AccountSchema.safeParse({
    currentPassword: get("currentPassword"),
    email: get("email"),
    newPassword: get("newPassword"),
    confirmPassword: get("confirmPassword"),
  });
}

const HOURS_ROWS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const Time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$|^$/, { error: "Hora inválida" });

/** Horario de los 7 días (0 = domingo). Vacío = sin horario. Siempre cierran antes de medianoche. */
const OpeningHoursSchema = z
  .array(z.object({ open: Time, close: Time }))
  .length(HOURS_ROWS.length)
  .superRefine((rows, ctx) => {
    rows.forEach(({ open, close }, i) => {
      const day = HOURS_ROWS[i];
      if (!open && !close) return;
      if (!open || !close) {
        ctx.addIssue({ code: "custom", message: `${day}: falta la hora de ${open ? "cierre" : "apertura"}.` });
      } else if (close <= open) {
        ctx.addIssue({ code: "custom", message: `${day}: la hora de cierre debe ser después de la de apertura.` });
      }
    });
  })
  .transform((rows) => rows.map(({ open, close }) => (open && close ? `${open}-${close}` : "")));

/** Horario de los dos turnos: la mañana termina antes de que empiece la tarde. */
const ShiftHoursSchema = z
  .array(z.object({ open: Time, close: Time }))
  .length(2)
  .superRefine((rows, ctx) => {
    const labels = ["Turno de la mañana", "Turno de la tarde"];
    rows.forEach(({ open, close }, i) => {
      if (!open || !close) ctx.addIssue({ code: "custom", message: `${labels[i]}: escribe la hora de inicio y de fin.` });
      else if (close <= open) ctx.addIssue({ code: "custom", message: `${labels[i]}: la hora de fin debe ser después de la de inicio.` });
    });
    if (rows[0].close && rows[1].open && rows[1].open < rows[0].close) {
      ctx.addIssue({ code: "custom", message: "El turno de la tarde debe empezar después de que termine el de la mañana." });
    }
  })
  .transform((rows) => rows.map(({ open, close }) => `${open}-${close}`));

/** Ajustes del restaurante. */
export const SettingsSchema = z.object({
  payWeekStart: z.coerce.number().int().min(0).max(6, { error: "Día inválido" }),
  payDay: z.coerce.number().int().min(0).max(6, { error: "Día de pago inválido" }),
  openingHours: OpeningHoursSchema,
  doubleShiftWeekdays: z
    .array(z.coerce.number().int().min(0).max(6))
    .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
  shiftHours: ShiftHoursSchema,
  whatsapp: z
    .string()
    .trim()
    // El indicativo real (PHONE_COUNTRY_CODE) se pone al armar el enlace; aquí solo se valida la forma.
    .refine((v) => whatsappNumber(v, "57") !== null, { error: "Número de WhatsApp inválido (ej. 301 216 8273)" }),
  // Vacío = sin recordatorios por correo
  reminderEmail: z.union([z.literal(""), z.email({ error: "Correo de recordatorios inválido" })]),
});

export function parseSettingsForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return SettingsSchema.safeParse({
    payWeekStart: formData.get("payWeekStart"),
    payDay: formData.get("payDay"),
    whatsapp: get("whatsapp"),
    reminderEmail: get("reminderEmail").trim().toLowerCase(),
    doubleShiftWeekdays: formData.getAll("doubleShiftWeekdays"),
    shiftHours: [0, 1].map((i) => ({ open: get(`shiftOpen${i}`), close: get(`shiftClose${i}`) })),
    openingHours: HOURS_ROWS.map((_, i) => ({ open: get(`open${i}`), close: get(`close${i}`) })),
  });
}
