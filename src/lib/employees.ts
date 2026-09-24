import * as z from "zod";

/** Índice = día de la semana de Date#getDay() (0 = domingo). */
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres` })
    .transform((v) => (v === "" ? null : v));

export const EmployeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(80, { error: "Máximo 80 caracteres" }),
  position: optionalText(40),
  phone: optionalText(20).refine((v) => v === null || /^[\d\s()+-]{7,20}$/.test(v), {
    error: "Teléfono inválido",
  }),
  hireDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "Fecha inválida" })
    .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00Z`))),
  restDays: z
    .array(z.coerce.number().int().min(0).max(6))
    .max(6, { error: "Debe trabajar al menos un día a la semana" })
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
});

export type EmployeeInput = z.output<typeof EmployeeSchema>;
export type EmployeeFieldErrors = Partial<Record<keyof EmployeeInput, string[]>>;

export function parseEmployeeForm(formData: FormData) {
  return EmployeeSchema.safeParse({
    name: formData.get("name") ?? "",
    position: formData.get("position") ?? "",
    phone: formData.get("phone") ?? "",
    hireDate: formData.get("hireDate") ?? "",
    restDays: formData.getAll("restDays"),
  });
}

/** Date guardada como @db.Date → "YYYY-MM-DD" para inputs de tipo date. */
export function toDateInputValue(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function formatRestDays(restDays: number[]) {
  return restDays.length ? restDays.map((d) => WEEKDAYS_SHORT[d]).join(", ") : "Sin descanso fijo";
}
