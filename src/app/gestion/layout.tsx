import type { Metadata } from "next";

/** Todo lo de /gestion (administración): fuera de buscadores e instalable como app. */
export const metadata: Metadata = {
  title: "Gestión Simba",
  description: "Empleados, asistencia, propinas, pagos y reservas del restaurante",
  manifest: "/gestion/manifest.webmanifest",
  // Nombre al agregarla a la pantalla de inicio en iPhone
  appleWebApp: { title: "Simba", capable: true },
  robots: { index: false, follow: false },
};

export default function GestionLayout({ children }: LayoutProps<"/gestion">) {
  return children;
}
