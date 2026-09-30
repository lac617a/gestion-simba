import * as z from "zod";
import type { UserRole } from "@/generated/prisma/enums";
import { passwordIssue } from "@/lib/account";

export const ROLES = ["ADMIN", "RESERVATIONS"] as const satisfies readonly UserRole[];

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  RESERVATIONS: "Reservas",
};

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  ADMIN: "Todo: asistencia, cierres, pagos, reportes, empleados, reservas y configuración.",
  RESERVATIONS: "Solo reservas: verlas, anotarlas, editarlas, marcar si llegaron y confirmar por WhatsApp.",
};

/** Pantalla de inicio de cada rol (a donde va al entrar). */
export function homeFor(role: UserRole) {
  return role === "ADMIN" ? "/gestion" : "/gestion/reservas";
}

/** Nombre para mostrar: el admin inicial no tiene nombre, se usa su correo. */
export function displayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

const Email = z.string().trim().toLowerCase().pipe(z.email({ error: "Correo inválido" }));
export const UserName = z.string().trim().min(2, { error: "Escribe el nombre" }).max(40, { error: "Máximo 40 caracteres" });

/**
 * Usuario creado o editado por un administrador. Al crear, la contraseña es
 * obligatoria; al editar, vacía = no se cambia.
 */
export function userFormSchema(mode: "new" | "edit") {
  return z
    .object({
      name: UserName,
      email: Email,
      role: z.enum(ROLES, { error: "Elige el rol" }),
      password: z.string(),
      confirmPassword: z.string(),
    })
    .superRefine((v, ctx) => {
      if (v.password === "") {
        if (mode === "new") ctx.addIssue({ code: "custom", path: ["password"], message: "Escribe una contraseña" });
        return;
      }
      const issue = passwordIssue(v.password);
      if (issue) ctx.addIssue({ code: "custom", path: ["password"], message: issue });
      if (v.password !== v.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "No coincide con la contraseña" });
      }
    });
}

export type UserInput = z.output<ReturnType<typeof userFormSchema>>;
export type UserFieldErrors = Partial<Record<keyof UserInput, string[]>>;

export function parseUserForm(formData: FormData, mode: "new" | "edit") {
  const get = (k: string) => String(formData.get(k) ?? "");
  return userFormSchema(mode).safeParse({
    name: get("name"),
    email: get("email"),
    role: get("role"),
    password: get("password"),
    confirmPassword: get("confirmPassword"),
  });
}
