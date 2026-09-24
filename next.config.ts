import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El servidor de pruebas (npm run dev:e2e) usa su propia carpeta para poder
  // correr junto al servidor normal.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
