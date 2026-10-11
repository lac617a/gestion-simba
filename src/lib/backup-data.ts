import "server-only";
import { gzipSync } from "node:zlib";
import { backupFileName, BACKUP_VERSION, loadOrder, scrubRows, SKIPPED_TABLES, totalRows, type Backup } from "@/lib/backup";
import { APP_TIMEZONE, DAY_CUTOFF_HOUR, today } from "@/lib/config";
import { db } from "@/lib/db";
import { formatShortDate, todayISO } from "@/lib/dates";
import { emailConfigured, sendEmail } from "@/lib/resend";
import { getSettings } from "@/lib/settings";

const identifier = (name: string) => `"${name.replace(/"/g, '""')}"`;
const literal = (text: string) => `'${text.replace(/'/g, "''")}'`;

/**
 * Todas las filas de todas las tablas. Los nombres salen del catálogo de
 * Postgres (una tabla nueva entra sola) y las filas se leen en una sola
 * consulta, así el respaldo es una foto coherente aunque alguien esté usando la app.
 */
export async function exportDatabase(): Promise<Backup> {
  const tables = await db.$queryRaw<{ name: string }[]>`
    SELECT tablename::text AS name FROM pg_tables WHERE schemaname = 'public'`;
  const references = await db.$queryRaw<{ table: string; references: string }[]>`
    SELECT t.relname::text AS "table", r.relname::text AS "references"
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_class r ON r.oid = c.confrelid
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`;

  const order = loadOrder(
    tables.map((t) => t.name).filter((name) => !SKIPPED_TABLES.has(name)),
    references
  );
  const [{ data }] = await db.$queryRawUnsafe<{ data: Record<string, Record<string, unknown>[]> }[]>(
    `SELECT json_build_object(${order
      .map((name) => `${literal(name)}, (SELECT COALESCE(json_agg(x), '[]'::json) FROM ${identifier(name)} x)`)
      .join(", ")}) AS data`
  );

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    tables: order.map((name) => ({ name, rows: scrubRows(name, data[name]) })),
  };
}

/** El respaldo como archivo: JSON comprimido (.json.gz) y su nombre con la fecha de hoy. */
export async function backupFile() {
  const backup = await exportDatabase();
  return {
    backup,
    filename: backupFileName(today()),
    content: gzipSync(Buffer.from(JSON.stringify(backup), "utf8")),
  };
}

export type BackupResult = { enviado: boolean; motivo?: string; filas?: number; kb?: number };

/**
 * Manda el respaldo adjunto al correo de Configuración → Respaldos. Nunca lanza.
 * La revisión diaria (Vercel Cron) lo llama sin `force`: una sola vez por día.
 * Con `force` ("Enviar ahora") sale aunque ya se haya enviado hoy.
 */
export async function sendBackupEmail({ force = false } = {}): Promise<BackupResult> {
  const settings = await getSettings();
  if (!settings.backupEmail) return { enviado: false, motivo: "sin correo de respaldos" };
  if (!emailConfigured()) return { enviado: false, motivo: "falta RESEND_API_KEY" };
  const date = today();
  if (!force && settings.lastBackupAt && todayISO(APP_TIMEZONE, DAY_CUTOFF_HOUR, settings.lastBackupAt) === date) {
    return { enviado: false, motivo: "ya se envió hoy" };
  }

  try {
    const { backup, filename, content } = await backupFile();
    const rows = totalRows(backup);
    const kb = Math.ceil(content.length / 1024);
    const lines = [
      `Adjunto va el respaldo de todos los datos de Gestión Simba del ${formatShortDate(date)}: ${rows.toLocaleString("es-CO")} registros en ${backup.tables.length} tablas (${kb} KB).`,
      "Guarda este correo. Con ese archivo se puede recuperar todo si algo se daña (el paso a paso está en DEPLOY.md, sección Respaldos).",
      "Las contraseñas de los usuarios no van en el respaldo.",
    ];
    await sendEmail({
      to: settings.backupEmail,
      subject: `Respaldo de Gestión Simba · ${formatShortDate(date)}`,
      text: lines.join("\n\n"),
      html: lines.map((line) => `<p>${line}</p>`).join(""),
      attachments: [{ filename, content, contentType: "application/gzip" }],
    });
    await db.appSettings.update({ where: { id: 1 }, data: { lastBackupAt: new Date() } });
    return { enviado: true, filas: rows, kb };
  } catch (error) {
    console.error("Respaldo diario:", error);
    return { enviado: false, motivo: error instanceof Error ? error.message : String(error) };
  }
}
