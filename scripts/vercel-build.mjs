// Build de Vercel (vercel.json → buildCommand).
// En producción aplica primero las migraciones pendientes de prisma/migrations
// y después compila: así nunca se publica código que espera tablas o columnas
// que todavía no existen. Si la migración falla, el build falla y sigue
// publicada la versión anterior.
//
// Necesita DIRECT_URL en Vercel (la conexión directa de Neon, sin "-pooler"):
// la conexión con pooler que usa la app no sirve para migrar. Sin DIRECT_URL no
// se aplica nada y hay que seguir migrando a mano (DEPLOY.md §6).
// En las vistas previas (ramas) nunca se migra: usan la misma base de datos.
import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit", env: process.env });

if (process.env.VERCEL_ENV !== "production") {
  console.log("› Vista previa: no se aplican migraciones.");
} else if (!process.env.DIRECT_URL) {
  console.warn(
    "› AVISO: falta DIRECT_URL, no se aplicaron migraciones. Si este cambio trae una nueva, aplícala a mano (DEPLOY.md §6)."
  );
} else {
  console.log("› Aplicando migraciones pendientes…");
  try {
    run("npx prisma migrate deploy");
  } catch {
    console.error(
      "› No se pudieron aplicar las migraciones: no se publica esta versión. Revisa que DIRECT_URL sea la conexión directa de Neon (sin -pooler)."
    );
    process.exit(1);
  }
}

run("npx next build");
