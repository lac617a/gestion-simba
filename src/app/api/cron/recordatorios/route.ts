import type { NextRequest } from "next/server";
import { syncPendingReminders } from "@/lib/reminders-data";

// Cada reserva ya programa su correo al guardarse; esto recoge las que quedaron
// sin programar (a más de 29 días, anteriores a los recordatorios o con fallo).
// Vercel Cron la llama una vez al día (vercel.json) con el CRON_SECRET.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  return Response.json(await syncPendingReminders());
}
