import { backupFile } from "@/lib/backup-data";
import { verifyAdmin } from "@/lib/dal";

/** Descarga el respaldo de todos los datos (JSON comprimido). Solo administradores. */
export async function GET() {
  await verifyAdmin();
  const { filename, content } = await backupFile();
  return new Response(content, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
