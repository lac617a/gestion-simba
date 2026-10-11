// Restaura un respaldo de Gestión Simba (el .json.gz que llega por correo o se
// baja en Configuración → Respaldos) en la base de datos de DATABASE_URL.
//
//   1. Las tablas deben existir:        npx prisma migrate deploy
//   2. Ver qué haría (no cambia nada):  npm run db:restore -- respaldo-simba-2026-10-12.json.gz
//   3. Restaurar (BORRA lo que haya):   npm run db:restore -- respaldo-simba-2026-10-12.json.gz --yes
//
// Las contraseñas no van en el respaldo. Si ADMIN_EMAIL y ADMIN_PASSWORD están
// en el entorno (.env), ese usuario queda con esa contraseña; a los demás hay
// que ponerles una nueva en Usuarios. Detalle en DEPLOY.md, sección Respaldos.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseBackup, restoreRows, totalRows } from "../src/lib/backup";

const identifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

function readBackup(path: string) {
  const raw = readFileSync(path);
  const gzipped = raw[0] === 0x1f && raw[1] === 0x8b;
  return parseBackup(JSON.parse((gzipped ? gunzipSync(raw) : raw).toString("utf8")));
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const confirmed = args.includes("--yes");
  if (!file) throw new Error("Falta el archivo: npm run db:restore -- respaldo-simba-AAAA-MM-DD.json.gz [--yes]");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (la base donde se va a restaurar).");

  const backup = readBackup(file);
  const target = new URL(url);
  console.log(`Respaldo del ${backup.createdAt}: ${totalRows(backup)} registros en ${backup.tables.length} tablas.`);
  console.log(`Base de destino: ${target.hostname}:${target.port || 5432}${target.pathname}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const existing = await prisma.$queryRaw<{ table: string; column: string }[]>`
      SELECT table_name::text AS "table", column_name::text AS "column"
      FROM information_schema.columns WHERE table_schema = 'public'`;
    const columns = new Map<string, Set<string>>();
    for (const c of existing) columns.set(c.table, (columns.get(c.table) ?? new Set()).add(c.column));

    const missing = backup.tables.filter((t) => !columns.has(t.name)).map((t) => t.name);
    if (missing.length > 0) {
      throw new Error(`En la base faltan tablas del respaldo (${missing.join(", ")}). Corre primero: npx prisma migrate deploy`);
    }

    for (const t of backup.tables) console.log(`  ${t.name.padEnd(22)} ${String(t.rows.length).padStart(7)}`);
    if (!confirmed) {
      console.log("\nNo se cambió nada. Para restaurar (borra lo que haya en esa base y carga el respaldo), repite con --yes");
      return;
    }

    // Todo o nada: si algo falla, la base queda como estaba.
    await prisma.$transaction(
      async (tx) => {
        const all = [...columns.keys()].filter((name) => name !== "_prisma_migrations");
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${all.map(identifier).join(", ")} RESTART IDENTITY CASCADE`);
        for (const t of backup.tables) {
          if (t.rows.length === 0) continue;
          // Solo las columnas que venían en el respaldo y siguen existiendo: las nuevas toman su valor por defecto.
          const cols = Object.keys(t.rows[0])
            .filter((c) => columns.get(t.name)!.has(c))
            .map(identifier)
            .join(", ");
          await tx.$executeRawUnsafe(
            `INSERT INTO ${identifier(t.name)} (${cols}) SELECT ${cols} FROM json_populate_recordset(NULL::${identifier(t.name)}, $1::json)`,
            JSON.stringify(restoreRows(t.name, t.rows))
          );
        }
      },
      { timeout: 120_000, maxWait: 20_000 }
    );
    console.log("\nRespaldo restaurado.");

    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    const admin = ADMIN_EMAIL && ADMIN_PASSWORD ? await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }) : null;
    if (admin) {
      await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(ADMIN_PASSWORD!, 10) } });
      console.log(`Contraseña de ${ADMIN_EMAIL}: la de ADMIN_PASSWORD. Entra con ese usuario y ponles contraseña nueva a los demás en Usuarios.`);
    } else {
      console.log(
        "Las contraseñas no van en el respaldo: define ADMIN_EMAIL (un usuario del respaldo) y ADMIN_PASSWORD en .env y repite, o nadie podrá entrar."
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
