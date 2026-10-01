import { createHash } from "node:crypto";
import { formatDayShort, zonedToUtc } from "@/lib/dates";
import { formatTime } from "@/lib/hours";
import {
  peopleLabel,
  reservationEmailBody,
  reservationLink,
  reservationRows,
  type ReminderData,
} from "@/lib/reminders";

/** Cuánto dura el evento en el calendario. */
export const EVENT_MINUTES = 120;

export type InviteMethod = "REQUEST" | "CANCEL";

/** Texto para un valor TEXT de iCalendar (RFC 5545 §3.3.11). */
export function icsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Corta líneas de más de 75 bytes (RFC 5545 §3.1) sin partir caracteres de varios bytes. */
export function foldLine(line: string) {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    // La primera línea admite 75 bytes; las siguientes empiezan con un espacio.
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** 2026-10-04T00:30:00.000Z → 20261004T003000Z */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export type CalendarEvent = {
  uid: string;
  sequence: number;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  url: string;
};

/** Archivo .ics de una invitación (REQUEST) o de su cancelación (CANCEL). */
export function buildIcs(
  e: CalendarEvent,
  method: InviteMethod,
  organizer: { name: string; email: string },
  attendee: string,
  now = new Date()
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Simba//Gestion Simba//ES",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsText(e.summary)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    `LOCATION:${icsText(e.location)}`,
    `URL:${e.url}`,
    `ORGANIZER;CN=${icsText(organizer.name)}:mailto:${organizer.email}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${attendee}`,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Evento de calendario de una reserva (la secuencia la pone quien lo manda). */
export function reservationEvent(
  r: ReminderData,
  opts: { timeZone: string; siteUrl: string; restaurant: string; address: string }
): Omit<CalendarEvent, "sequence"> {
  const start = zonedToUtc(r.date, r.time, opts.timeZone);
  const rows = reservationRows(r).filter(([k]) => k !== "Cuándo");
  const url = reservationLink(opts.siteUrl, r.id);
  return {
    uid: `reserva-${r.id}@${new URL(opts.siteUrl).host}`,
    start,
    end: new Date(start.getTime() + EVENT_MINUTES * 60_000),
    summary: `Reserva: ${r.customerName} (${peopleLabel(r.partySize)})`,
    description: [...rows.map(([k, v]) => `${k}: ${v}`), "", url].join("\n"),
    location: `${opts.restaurant}, ${opts.address}`,
    url,
  };
}

/** Huella de lo que se ve en el calendario: si no cambia, no se manda otra invitación. */
export function eventHash(e: Omit<CalendarEvent, "sequence">) {
  const { start, end, summary, description, location } = e;
  return createHash("sha256")
    .update(JSON.stringify([start.toISOString(), end.toISOString(), summary, description, location]))
    .digest("hex")
    .slice(0, 32);
}

/** Correo que acompaña la invitación: nueva, actualizada o cancelada. */
export function inviteEmail(r: ReminderData, kind: "new" | "update" | "cancel", restaurant: string, siteUrl: string) {
  const label = { new: "Nueva reserva", update: "Reserva actualizada", cancel: "Reserva cancelada" }[kind];
  const when = `${formatDayShort(r.date)}, ${formatTime(r.time)}`;
  const subject = `${label}: ${r.customerName} · ${when} (${peopleLabel(r.partySize)})`;
  const body = reservationEmailBody({
    kicker: `${label} · ${restaurant}${kind === "cancel" ? " · se quita del calendario" : " · va a tu Google Calendar"}`,
    heading: `${when} · ${r.customerName}`,
    rows: reservationRows(r),
    link: reservationLink(siteUrl, r.id),
  });
  return { subject, ...body };
}
