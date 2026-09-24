import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

/**
 * Verifica la sesión del admin. Llamar en cada página y Server Action protegida:
 * el proxy solo hace una comprobación optimista.
 */
export const verifySession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) redirect("/login");
  return session;
});
