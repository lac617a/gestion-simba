"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { attemptLogin } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  // trim antes de validar: el teclado del celular suele dejar un espacio al final
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Correo inválido" })),
  password: z.string().min(1, { error: "Escribe tu contraseña" }),
});

export type LoginState = { error?: string; email?: string } | undefined;

/** IP del cliente (en Vercel viene en x-forwarded-for). */
async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  const result = await attemptLogin(parsed.data.email, parsed.data.password, await clientIp());
  if (!result.ok) return { error: result.error, email };

  await createSession(result.userId, result.sessionVersion);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
