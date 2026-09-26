import type { MetadataRoute } from "next";
import { BRAND_GREEN } from "@/lib/brand";

/**
 * Manifiesto de la app de administración ("Agregar a pantalla de inicio").
 * Vive en /gestion para que la página pública no se instale como la app interna.
 */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    name: "Gestión Simba",
    short_name: "Simba",
    description: "Empleados, asistencia, propinas, pagos y reservas del restaurante",
    lang: "es-CO",
    start_url: "/gestion",
    scope: "/gestion",
    display: "standalone",
    background_color: BRAND_GREEN,
    theme_color: BRAND_GREEN,
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
