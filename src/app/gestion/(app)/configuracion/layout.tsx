import { Suspense } from "react";
import { verifyUser } from "@/lib/dal";
import { APP_VERSION } from "@/lib/version";
import { SettingsNav } from "./settings-nav";

/**
 * Configuración por secciones: en computador, menú lateral + la sección; en el
 * celular, la lista de secciones (page.tsx) y cada sección en su pantalla.
 * El menú va en un Suspense para que el layout no espere a la base de datos:
 * así la sección muestra su esqueleto de carga al instante.
 */
export default function SettingsLayout({ children }: LayoutProps<"/gestion/configuracion">) {
  return (
    <div className="md:flex md:items-start md:gap-8">
      <Suspense fallback={<div className="hidden md:block md:w-56 md:shrink-0" />}>
        <Sidebar />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Solo administradores: los demás usuarios tienen una sola sección ("Mi cuenta"). */
async function Sidebar() {
  const { role } = await verifyUser();
  if (role !== "ADMIN") return null;
  return (
    <aside className="hidden md:sticky md:top-20 md:block md:w-56 md:shrink-0">
      <p className="mb-2 px-2.5 text-lg font-semibold">Configuración</p>
      <SettingsNav variant="sidebar" />
      <p className="mt-4 px-2.5 text-xs text-muted-foreground">Gestión Simba · versión {APP_VERSION}</p>
    </aside>
  );
}
