import * as z from "zod";

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

/** Ajustes del restaurante. */
export const SettingsSchema = z.object({
  payWeekStart: z.coerce.number().int().min(0).max(6, { error: "Día inválido" }),
  closedWeekdays: z
    .array(z.coerce.number().int().min(0).max(6))
    .max(6, { error: "El restaurante debe abrir al menos un día" })
    .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
});

export function parseSettingsForm(formData: FormData) {
  return SettingsSchema.safeParse({
    payWeekStart: formData.get("payWeekStart"),
    closedWeekdays: formData.getAll("closedWeekdays"),
  });
}
