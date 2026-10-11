import type { ISODate } from "@/lib/dates";

/** Versión del formato del archivo de respaldo. */
export const BACKUP_VERSION = 1;

export type BackupTable = { name: string; rows: Record<string, unknown>[] };

/**
 * Respaldo de la base: todas las tablas con sus filas, tal como las devuelve
 * Postgres (`json_agg`), en el orden en que hay que cargarlas al restaurar.
 */
export type Backup = { version: number; createdAt: string; tables: BackupTable[] };

/** No van en el respaldo: el registro de migraciones (lo crea `prisma migrate`) y los intentos fallidos de login. */
export const SKIPPED_TABLES: ReadonlySet<string> = new Set(["_prisma_migrations", "LoginThrottle"]);

/** Columnas que no salen de la base: las contraseñas, aunque estén cifradas. Al restaurar se ponen nuevas. */
const SECRET_COLUMNS: Record<string, string[]> = { User: ["passwordHash"] };

/** Valor que queda en una contraseña restaurada: no coincide con ninguna, así que nadie entra hasta poner una nueva. */
export const NO_PASSWORD = "!sin-contraseña (restaurado de un respaldo)";

/**
 * Orden de carga: cada tabla después de las que referencia con una llave
 * foránea (primero Employee, después Attendance…). Entre iguales, por nombre.
 */
export function loadOrder(tables: string[], references: { table: string; references: string }[]): string[] {
  const pending = new Set(tables);
  const needs = new Map(tables.map((t) => [t, new Set<string>()]));
  for (const r of references) {
    if (r.table !== r.references && pending.has(r.table) && pending.has(r.references)) needs.get(r.table)!.add(r.references);
  }
  const order: string[] = [];
  while (pending.size > 0) {
    const ready = [...pending].filter((t) => [...needs.get(t)!].every((d) => !pending.has(d))).sort();
    if (ready.length === 0) throw new Error(`Tablas que se referencian en círculo: ${[...pending].join(", ")}`);
    for (const t of ready) {
      order.push(t);
      pending.delete(t);
    }
  }
  return order;
}

/** Quita de las filas lo que no debe salir de la base. */
export function scrubRows(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const secret = SECRET_COLUMNS[table];
  if (!secret) return rows;
  return rows.map((row) => ({ ...row, ...Object.fromEntries(secret.map((column) => [column, null])) }));
}

/** Al restaurar: las columnas que no viajaron reciben un valor que no abre ninguna sesión. */
export function restoreRows(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const secret = SECRET_COLUMNS[table];
  if (!secret) return rows;
  return rows.map((row) => ({ ...row, ...Object.fromEntries(secret.map((column) => [column, row[column] ?? NO_PASSWORD])) }));
}

export const backupFileName = (date: ISODate) => `respaldo-simba-${date}.json.gz`;

export function totalRows(backup: Backup) {
  return backup.tables.reduce((sum, t) => sum + t.rows.length, 0);
}

/** Comprueba que un archivo leído es un respaldo de este formato. */
export function parseBackup(value: unknown): Backup {
  const b = value as Partial<Backup> | null;
  if (!b || typeof b !== "object" || !Array.isArray(b.tables) || typeof b.createdAt !== "string") {
    throw new Error("El archivo no es un respaldo de Gestión Simba.");
  }
  if (b.version !== BACKUP_VERSION) throw new Error(`Respaldo de la versión ${b.version}; este programa lee la ${BACKUP_VERSION}.`);
  for (const t of b.tables) {
    if (typeof t?.name !== "string" || !Array.isArray(t.rows)) throw new Error("El respaldo está incompleto o dañado.");
  }
  return b as Backup;
}
