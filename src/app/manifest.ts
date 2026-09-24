import type { MetadataRoute } from "next";
import { BRAND_GREEN } from "@/lib/brand";

/** Permite "Agregar a pantalla de inicio" como app, con el logo de Simba. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestión Simba",
    short_name: "Simba",
    description: "Empleados, asistencia, propinas y pagos del restaurante",
    lang: "es-CO",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_GREEN,
    theme_color: BRAND_GREEN,
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
