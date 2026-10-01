import type { ReservationStatus } from "@/generated/prisma/enums";
import { formatDayMonth, zonedToUtc, type ISODate } from "@/lib/dates";
import { formatTime } from "@/lib/hours";
import { occasionLabel } from "@/lib/reservations";

/** El correo sale esta cantidad de minutos antes de la reserva. */
export const REMINDER_MINUTES_BEFORE = 60;

/** Resend programa correos hasta 30 días adelante; se deja un día de margen. */
export const MAX_SCHEDULE_DAYS = 29;

export type ReminderPlan =
  | { kind: "schedule"; at: Date }
  /** La reserva empieza en menos de 1 hora: se manda ya */
  | { kind: "send-now" }
  | { kind: "none"; reason: "disabled" | "not-confirmed" | "started" | "too-far" };

/** Qué hacer con el recordatorio de una reserva en este momento. */
export function planReminder(
  r: { status: ReservationStatus; date: ISODate; time: string },
  timeZone: string,
  now: Date,
  enabled: boolean
): ReminderPlan {
  if (!enabled) return { kind: "none", reason: "disabled" };
  if (r.status !== "CONFIRMED") return { kind: "none", reason: "not-confirmed" };
  const start = zonedToUtc(r.date, r.time, timeZone);
  if (start <= now) return { kind: "none", reason: "started" };
  const at = new Date(start.getTime() - REMINDER_MINUTES_BEFORE * 60_000);
  if (at <= now) return { kind: "send-now" };
  if (at.getTime() - now.getTime() > MAX_SCHEDULE_DAYS * 86_400_000) return { kind: "none", reason: "too-far" };
  return { kind: "schedule", at };
}

export type ReminderData = {
  id: string;
  date: ISODate;
  time: string;
  customerName: string;
  partySize: number;
  phone: string | null;
  occasion: string | null;
  honoree: string | null;
  note: string | null;
  /** Quién la registró */
  createdBy: string | null;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const peopleLabel =(n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;

/** Datos de la reserva como filas "etiqueta: valor" (las vacías no salen). */
export function reservationRows(r: ReminderData): [string, string][] {
  const rows: [string, string | null][] = [
    ["Cuándo", `${formatDayMonth(r.date)}, ${formatTime(r.time)}`],
    ["A nombre de", r.customerName],
    ["Personas", String(r.partySize)],
    ["Teléfono", r.phone],
    ["Ocasión", occasionLabel(r.occasion, r.honoree)],
    ["Observación", r.note],
    ["Registrada por", r.createdBy],
  ];
  return rows.filter((row): row is [string, string] => !!row[1]);
}

export const reservationLink = (siteUrl: string, id: string) => `${siteUrl}/gestion/reservas/${id}`;

/** Correo de una reserva: encabezado, título, tabla de datos y botón a la reserva (texto y HTML). */
export function reservationEmailBody(opts: { kicker: string; heading: string; rows: [string, string][]; link: string }) {
  const text = [opts.kicker, "", ...opts.rows.map(([k, v]) => `${k}: ${v}`), "", `Ver la reserva: ${opts.link}`].join("\n");
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c2b20;max-width:480px">
  <p style="margin:0 0 4px;font-size:13px;color:#6b7280">${escapeHtml(opts.kicker)}</p>
  <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(opts.heading)}</h1>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;width:100%">
    ${opts.rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`
      )
      .join("\n    ")}
  </table>
  <p style="margin:20px 0 0"><a href="${escapeHtml(opts.link)}" style="display:inline-block;background:#1c2b20;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">Ver la reserva</a></p>
</div>`;
  return { text, html };
}

/** Asunto y cuerpo (texto y HTML) del recordatorio. */
export function reminderEmail(r: ReminderData, restaurant: string, siteUrl: string) {
  const subject = `Reserva a las ${formatTime(r.time)}: ${r.customerName} (${peopleLabel(r.partySize)})`;
  const body = reservationEmailBody({
    kicker: `Recordatorio de reserva en ${restaurant}`,
    heading: `${formatTime(r.time)} · ${r.customerName}`,
    rows: reservationRows(r),
    link: reservationLink(siteUrl, r.id),
  });
  return { subject, ...body };
}
