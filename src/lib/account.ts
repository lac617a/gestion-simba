import * as z from "zod";
import { whatsappNumber } from "@/lib/reservations";

export const MIN_PASSWORD = 10;

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
    if (v.newPassword.length < MIN_PASSWORD) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: `Mínimo ${MIN_PASSWORD} caracteres` });
    } else if (!/[a-zA-Z]/.test(v.newPassword) || !/\d/.test(v.newPassword)) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Debe tener letras y números" });
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

const HOURS_ROWS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Festivos"];

const Time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$|^$/, { error: "Hora inválida" });

/** Horario de los 7 días + festivos. Vacío = sin horario. Siempre cierran antes de medianoche. */
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

/** Ajustes del restaurante. */
export const SettingsSchema = z.object({
  payWeekStart: z.coerce.number().int().min(0).max(6, { error: "Día inválido" }),
  payDay: z.coerce.number().int().min(0).max(6, { error: "Día de pago inválido" }),
  closedWeekdays: z
    .array(z.coerce.number().int().min(0).max(6))
    .max(6, { error: "El restaurante debe abrir al menos un día" })
    .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
  openingHours: OpeningHoursSchema,
  whatsapp: z
    .string()
    .trim()
    // El indicativo real (PHONE_COUNTRY_CODE) se pone al armar el enlace; aquí solo se valida la forma.
    .refine((v) => whatsappNumber(v, "57") !== null, { error: "Número de WhatsApp inválido (ej. 301 216 8273)" }),
});

export function parseSettingsForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return SettingsSchema.safeParse({
    payWeekStart: formData.get("payWeekStart"),
    payDay: formData.get("payDay"),
    closedWeekdays: formData.getAll("closedWeekdays"),
    whatsapp: get("whatsapp"),
    openingHours: HOURS_ROWS.map((_, i) => ({ open: get(`open${i}`), close: get(`close${i}`) })),
  });
}
