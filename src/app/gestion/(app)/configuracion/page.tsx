import type { Metadata } from "next";
import { verifyUser } from "@/lib/dal";
import { APP_VERSION } from "@/lib/version";
import { AccountSection } from "./account-section";
import { SettingsNav } from "./settings-nav";

export const metadata: Metadata = { title: "Configuración · Gestión Simba" };

/**
 * Entrada de Configuración. Celular: la lista de secciones. Computador: "Mi
 * cuenta" junto al menú lateral. Los usuarios de reservas solo tienen su cuenta.
 */
export default async function SettingsHome() {
  const user = await verifyUser();
  if (user.role !== "ADMIN") return <AccountSection user={user} back={false} />;

  return (
    <>
      <div className="grid gap-4 md:hidden">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <SettingsNav variant="list" />
        <p className="text-xs text-muted-foreground">Gestión Simba · versión {APP_VERSION}</p>
      </div>
      <div className="hidden md:block">
        <AccountSection user={user} />
      </div>
    </>
  );
}
