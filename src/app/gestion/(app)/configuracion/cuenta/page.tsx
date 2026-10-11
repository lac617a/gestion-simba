import type { Metadata } from "next";
import { verifyUser } from "@/lib/dal";
import { AccountSection } from "../account-section";

export const metadata: Metadata = { title: "Mi cuenta · Configuración · Gestión Simba" };

/** Para cualquier usuario: su correo, su contraseña y sus sesiones. */
export default async function AccountPage() {
  const user = await verifyUser();
  return <AccountSection user={user} back={user.role === "ADMIN"} />;
}
