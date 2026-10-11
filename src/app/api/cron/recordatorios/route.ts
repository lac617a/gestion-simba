import type { NextRequest } from "next/server";
import { sendBackupEmail } from "@/lib/backup-data";
import { syncPendingCalendar } from "@/lib/calendar-data";
import { syncPendingReminders } from "@/lib/reminders-data";

// Cada reserva ya programa su correo y manda su invitación de calendario al
// guardarse; esto recoge lo que quedó pendiente (recordatorios a más de 29 días,
// reservas anteriores a estas funciones o envíos que fallaron).
// También manda el respaldo diario de los datos (Configuración → Respaldos).
// Vercel Cron la llama una vez al día (vercel.json) con el CRON_SECRET.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  return Response.json({
    recordatorios: await syncPendingReminders(),
    calendario: await syncPendingCalendar(),
    respaldo: await sendBackupEmail(),
  });
}
