import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El servidor de pruebas (npm run dev:e2e) usa su propia carpeta para poder
  // correr junto al servidor normal.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Los PDF leen el logo del disco: que viaje con esas rutas al publicar.
  outputFileTracingIncludes: {
    "/gestion/*/pdf": ["./public/brand/simba-logo.png"],
  },
  // La administración se movió a /gestion: las direcciones viejas (favoritos,
  // app instalada) siguen funcionando.
  async redirects() {
    return ["asistencia", "empleados", "pagos", "reportes", "reservas", "configuracion", "login", "salir"].flatMap((p) => [
      { source: `/${p}`, destination: `/gestion/${p}`, permanent: false },
      { source: `/${p}/:path*`, destination: `/gestion/${p}/:path*`, permanent: false },
    ]);
  },
};

export default nextConfig;
