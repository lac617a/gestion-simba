import * as z from "zod";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { addDays, formatDayMonth, type ISODate } from "@/lib/dates";
import { formatHours, formatTime, type OpeningHours } from "@/lib/hours";

/** Ocasiones frecuentes para el selector; "Otra" deja escribir cualquiera. */
export const OCCASIONS = ["Cumpleaños", "Aniversario", "Grado", "Despedida", "Reunión de trabajo", "Pedida de mano"];
export const OTHER_OCCASION = "Otra";

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegó",
  NO_SHOW: "No vino",
  CANCELLED: "Cancelada",
};

export const RESERVATION_STATUS_CLASS: Record<ReservationStatus, string> = {
  CONFIRMED: "border-sky-300 bg-sky-50 text-sky-800",
  ARRIVED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  NO_SHOW: "border-red-300 bg-red-50 text-red-800",
  CANCELLED: "border-zinc-300 bg-zinc-100 text-zinc-600",
};

export const MAX_PARTY_SIZE = 200;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres` })
    .transform((v) => (v === "" ? null : v));

export const ReservationSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, { error: "Escribe el nombre de quien reserva" })
      .max(80, { error: "Máximo 80 caracteres" }),
    phone: optionalText(20).refine((v) => v === null || /^[\d\s()+-]{7,20}$/.test(v), {
      error: "Teléfono inválido",
    }),
    partySize: z.coerce
      .number({ error: "Escribe cuántas personas" })
      .int({ error: "Debe ser un número entero" })
      .min(1, { error: "Mínimo 1 persona" })
      .max(MAX_PARTY_SIZE, { error: `Máximo ${MAX_PARTY_SIZE} personas` }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Elige la fecha" }),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Elige la hora" }),
    occasion: optionalText(60),
    honoree: optionalText(80),
    note: optionalText(500),
  })
  // Sin ocasión no hay "persona de la ocasión".
  .transform((v) => ({ ...v, honoree: v.occasion ? v.honoree : null }));

export type ReservationInput = z.output<typeof ReservationSchema>;
export type ReservationFieldErrors = Partial<Record<keyof ReservationInput, string[]>>;

/** Lee el formulario. La ocasión viene del selector, o del texto libre si se eligió "Otra". */
export function parseReservationForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  const choice = get("occasionChoice");
  return ReservationSchema.safeParse({
    customerName: get("customerName"),
    phone: get("phone"),
    partySize: get("partySize"),
    date: get("date"),
    time: get("time"),
    occasion: choice === OTHER_OCCASION ? get("occasionOther") : choice,
    honoree: get("honoree"),
    note: get("note"),
  });
}

/** Separa una ocasión guardada en selector + texto libre, para el formulario. */
export function splitOccasion(occasion: string | null) {
  if (!occasion) return { choice: "", other: "" };
  return OCCASIONS.includes(occasion) ? { choice: occasion, other: "" } : { choice: OTHER_OCCASION, other: occasion };
}

/** "Cumpleaños de Laura", "Aniversario", null */
export function occasionLabel(occasion: string | null, honoree: string | null) {
  if (!occasion) return null;
  return honoree ? `${occasion} de ${honoree}` : occasion;
}

/** Aviso (no la impide) si la hora queda fuera del horario de atención del día. */
export function outsideHoursWarning(hours: OpeningHours | null, time: string): string | null {
  if (!hours || (time >= hours.open && time < hours.close)) return null;
  return `${formatTime(time)} está fuera del horario (${formatHours(hours)})`;
}

/**
 * Número para wa.me (solo dígitos, con indicativo). "300 123 4567" → "573001234567";
 * "+1 305 555 0100" se deja igual. Números cortos (fijos viejos) → null.
 */
export function whatsappNumber(phone: string | null, countryCode: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (!phone.trim().startsWith("+")) {
    if (digits.length === 10) digits = countryCode + digits;
    else if (!(digits.startsWith(countryCode) && digits.length === countryCode.length + 10)) return null;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

type ConfirmationData = {
  customerName: string;
  date: ISODate;
  time: string;
  partySize: number;
  occasion: string | null;
  honoree: string | null;
};

/** Mensaje de confirmación de la reserva, listo para enviar por WhatsApp. */
export function confirmationMessage(r: ConfirmationData, restaurant: string, today: ISODate) {
  const firstName = r.customerName.trim().split(/\s+/)[0];
  const when = r.date === today ? "hoy " : r.date === addDays(today, 1) ? "mañana " : "el ";
  const occasion = occasionLabel(r.occasion, r.honoree);
  return [
    `Hola ${firstName}, te escribimos de ${restaurant} para confirmar tu reserva:`,
    "",
    `📅 ${when}${formatDayMonth(r.date)}, a las ${formatTime(r.time)}`,
    `👥 ${r.partySize} ${r.partySize === 1 ? "persona" : "personas"}`,
    ...(occasion ? [`🎉 ${occasion}`] : []),
    "",
    "¡Te esperamos!",
  ].join("\n");
}

/** Enlace que abre WhatsApp con el mensaje escrito; el envío lo hace quien lo abre. */
export function whatsappHref(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Las canceladas no cuentan en los totales del día. */
export function dayTotals(reservations: { partySize: number; status: ReservationStatus }[]) {
  const active = reservations.filter((r) => r.status !== "CANCELLED");
  return { count: active.length, people: active.reduce((sum, r) => sum + r.partySize, 0) };
}
