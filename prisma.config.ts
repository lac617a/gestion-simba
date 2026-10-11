import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL (conexión directa, sin pooler) solo existe en Vercel: la usa el
    // build para aplicar migraciones. En local y a mano se usa DATABASE_URL.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
