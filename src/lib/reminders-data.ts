import "server-only";
import { BRAND_NAME } from "@/lib/brand";
import { APP_TIMEZONE, today } from "@/lib/config";
import { db } from "@/lib/db";
import { addDays, dateToISO, isoToDate } from "@/lib/dates";
import { SITE_URL } from "@/lib/public-site";
import { MAX_SCHEDULE_DAYS, planReminder, reminderEmail } from "@/lib/reminders";
import { cancelEmail, emailConfigured, sendEmail } from "@/lib/resend";
import { getSettings } from "@/lib/settings";
import { displayName } from "@/lib/users";

export type ReminderOutcome = "scheduled" | "sent" | "kept" | "none" | "error";

async function cancelQuietly(emailId: string) {
  try {
    await cancelEmail(emailId);
  } catch (e) {
    // Ya había salido o ya estaba cancelado: no hay nada más que hacer.
    console.warn(`[recordatorios] no se pudo cancelar ${emailId}:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Deja al día el correo de 1 hora antes de una reserva: cancela el programado
 * (si aún no salió) y programa otro con los datos actuales, o ninguno si ya no
 * aplica (cancelada, ya pasó, muy lejos…). Nunca lanza: un fallo de Resend no
 * debe impedir guardar la reserva; la revisión diaria vuelve a intentarlo.
 */
export async function syncReservationReminder(id: string, now = new Date()): Promise<ReminderOutcome> {
  try {
    const r = await db.reservation.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true, email: true } } },
    });
    if (!r) return "none";
    const { reminderEmail: to } = await getSettings();
    const date = dateToISO(r.date);
    const alreadySent = !!r.reminderEmailId && !!r.reminderAt && r.reminderAt <= now;

    if (r.reminderEmailId && !alreadySent) {
      await cancelQuietly(r.reminderEmailId);
      await db.reservation.update({ where: { id }, data: { reminderEmailId: null, reminderAt: null } });
    }

    const plan = planReminder({ status: r.status, date, time: r.time }, APP_TIMEZONE, now, emailConfigured() && !!to);
    if (plan.kind === "none") return alreadySent ? "kept" : "none";
    // Ya se avisó y la reserva sigue dentro de la hora: no se repite.
    if (alreadySent && plan.kind === "send-now") return "kept";

    const email = reminderEmail(
      {
        id: r.id,
        date,
        time: r.time,
        customerName: r.customerName,
        partySize: r.partySize,
        phone: r.phone,
        occasion: r.occasion,
        honoree: r.honoree,
        note: r.note,
        createdBy: r.createdBy && displayName(r.createdBy),
      },
      BRAND_NAME,
      SITE_URL
    );
    const scheduledAt = plan.kind === "schedule" ? plan.at : undefined;
    const emailId = await sendEmail({
      to,
      ...email,
      scheduledAt,
      // Cambia con cada edición de la reserva: una repetición de la misma no duplica el correo.
      idempotencyKey: `recordatorio-${r.id}-${r.updatedAt.getTime()}`,
    });
    await db.reservation.update({ where: { id }, data: { reminderEmailId: emailId, reminderAt: scheduledAt ?? now } });
    return scheduledAt ? "scheduled" : "sent";
  } catch (e) {
    console.error(`[recordatorios] reserva ${id}:`, e instanceof Error ? e.message : e);
    return "error";
  }
}

/** Antes de borrar una reserva: cancela su recordatorio si aún no salió. */
export async function cancelReservationReminder(id: string, now = new Date()) {
  const r = await db.reservation.findUnique({ where: { id }, select: { reminderEmailId: true, reminderAt: true } });
  if (r?.reminderEmailId && r.reminderAt && r.reminderAt > now) await cancelQuietly(r.reminderEmailId);
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Revisión diaria (cron): programa los recordatorios que faltan, es decir, de
 * reservas confirmadas que estaban a más de 29 días, que existían antes de los
 * recordatorios o cuyo envío a Resend falló.
 */
export async function syncPendingReminders(now = new Date()) {
  const t = today();
  const rows = await db.reservation.findMany({
    where: {
      status: "CONFIRMED",
      reminderEmailId: null,
      date: { gte: isoToDate(t), lte: isoToDate(addDays(t, MAX_SCHEDULE_DAYS + 1)) },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: { id: true },
  });
  const outcomes: Record<ReminderOutcome, number> = { scheduled: 0, sent: 0, kept: 0, none: 0, error: 0 };
  for (const [i, { id }] of rows.entries()) {
    if (i > 0) await pause(600); // Resend admite pocas peticiones por segundo
    outcomes[await syncReservationReminder(id, now)]++;
  }
  return { checked: rows.length, ...outcomes };
}
