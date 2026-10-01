import "server-only";
import { BRAND_NAME } from "@/lib/brand";
import {
  buildIcs,
  eventHash,
  inviteEmail,
  reservationEvent,
  type CalendarEvent,
  type InviteMethod,
} from "@/lib/calendar-invite";
import { APP_TIMEZONE, today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { SITE, SITE_URL } from "@/lib/public-site";
import type { ReminderData } from "@/lib/reminders";
import { emailConfigured, fromParts, sendEmail } from "@/lib/resend";
import { getSettings } from "@/lib/settings";
import { displayName } from "@/lib/users";

export type CalendarOutcome = "sent" | "updated" | "removed" | "skipped" | "error";

const load = (id: string) =>
  db.reservation.findUnique({ where: { id }, include: { createdBy: { select: { name: true, email: true } } } });
type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

function eventOf(r: Loaded) {
  const data: ReminderData = {
    id: r.id,
    date: dateToISO(r.date),
    time: r.time,
    customerName: r.customerName,
    partySize: r.partySize,
    phone: r.phone,
    occasion: r.occasion,
    honoree: r.honoree,
    note: r.note,
    createdBy: r.createdBy && displayName(r.createdBy),
  };
  const event = reservationEvent(data, {
    timeZone: APP_TIMEZONE,
    siteUrl: SITE_URL,
    restaurant: SITE.alternateNames[0],
    address: `${SITE.address}, ${SITE.city}`,
  });
  return { data, event };
}

/** Manda la invitación (REQUEST) o su cancelación (CANCEL) con el .ics adjunto. */
async function sendInvite(
  r: Loaded,
  { data, event }: ReturnType<typeof eventOf>,
  method: InviteMethod,
  to: string,
  sequence: number,
  kind: "new" | "update" | "cancel"
) {
  const ics = buildIcs({ ...event, sequence } satisfies CalendarEvent, method, fromParts(), to);
  await sendEmail({
    to,
    ...inviteEmail(data, kind, BRAND_NAME, SITE_URL),
    idempotencyKey: `calendario-${r.id}-${sequence}-${method}`,
    attachments: [{ filename: "invite.ics", content: ics, contentType: `text/calendar; method=${method}; charset=UTF-8` }],
  });
}

/**
 * Deja la reserva al día en Google Calendar mandando invitaciones por correo:
 * nueva → invitación; cambió algo visible (fecha, hora, datos) → actualización
 * (mismo evento, versión mayor); cancelada → se quita. Marcar Llegó/No vino no
 * cambia nada visible y no manda correo. Nunca lanza: si Resend falla, la reserva
 * igual se guarda y la revisión diaria vuelve a intentarlo.
 */
export async function syncReservationCalendar(id: string, now = new Date()): Promise<CalendarOutcome> {
  try {
    if (!emailConfigured()) return "skipped";
    const r = await load(id);
    if (!r) return "skipped";
    const { calendarEmail: to } = await getSettings();
    const ev = eventOf(r);
    let sequence = r.calendarSequence;

    if (r.status === "CANCELLED") {
      if (!r.calendarTo) return "skipped";
      sequence++;
      await sendInvite(r, ev, "CANCEL", r.calendarTo, sequence, "cancel");
      await db.reservation.update({ where: { id }, data: { calendarTo: null, calendarHash: null, calendarSequence: sequence } });
      return "removed";
    }

    if (!to) return "skipped"; // calendario desactivado en Configuración
    const hash = eventHash(ev.event);
    if (r.calendarTo === to && r.calendarHash === hash) return "skipped";
    // Las que ya pasaron y nunca se mandaron (anteriores a esta función) no se llenan.
    if (!r.calendarTo && ev.event.end <= now) return "skipped";

    // Cambió el correo del calendario en Configuración: se quita del anterior.
    if (r.calendarTo && r.calendarTo !== to) {
      sequence++;
      await sendInvite(r, ev, "CANCEL", r.calendarTo, sequence, "cancel");
      await db.reservation.update({ where: { id }, data: { calendarTo: null, calendarHash: null, calendarSequence: sequence } });
    }
    const kind = r.calendarTo === to ? "update" : "new";
    sequence++;
    await sendInvite(r, ev, "REQUEST", to, sequence, kind);
    await db.reservation.update({ where: { id }, data: { calendarTo: to, calendarHash: hash, calendarSequence: sequence } });
    return kind === "update" ? "updated" : "sent";
  } catch (e) {
    console.error(`[calendario] reserva ${id}:`, e instanceof Error ? e.message : e);
    return "error";
  }
}

/** Antes de borrar una reserva: la quita del calendario. */
export async function removeReservationCalendar(id: string) {
  try {
    if (!emailConfigured()) return;
    const r = await load(id);
    if (!r?.calendarTo) return;
    await sendInvite(r, eventOf(r), "CANCEL", r.calendarTo, r.calendarSequence + 1, "cancel");
  } catch (e) {
    console.error(`[calendario] al eliminar ${id}:`, e instanceof Error ? e.message : e);
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Revisión diaria (cron): manda al calendario las reservas de hoy en adelante que
 * todavía no están (anteriores a esta función o cuyo envío falló).
 */
export async function syncPendingCalendar(now = new Date()) {
  const rows = await db.reservation.findMany({
    where: { status: { not: "CANCELLED" }, calendarTo: null, date: { gte: isoToDate(today()) } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: { id: true },
  });
  const outcomes: Record<CalendarOutcome, number> = { sent: 0, updated: 0, removed: 0, skipped: 0, error: 0 };
  for (const [i, { id }] of rows.entries()) {
    if (i > 0) await pause(600); // Resend admite pocas peticiones por segundo
    outcomes[await syncReservationCalendar(id, now)]++;
  }
  return { checked: rows.length, ...outcomes };
}
