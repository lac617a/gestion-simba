import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// La BD local de `prisma dev` (PGlite) atiende una conexión a la vez: con varias
// en paralelo se mezclan las consultas. En local se usa DATABASE_POOL_MAX=1.
const poolMax = Number(process.env.DATABASE_POOL_MAX) || undefined;

// Reutiliza la instancia en desarrollo para no abrir conexiones en cada recarga.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: poolMax }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
