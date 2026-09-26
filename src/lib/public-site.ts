import { formatDayMonth, type ISODate } from "@/lib/dates";
import { formatHours, HOLIDAY_ROW, parseHours } from "@/lib/hours";
import { occasionLabel } from "@/lib/reservations";

/** Dirección pública del sitio (enlaces absolutos: redes, Google, sitemap). */
export const SITE_URL = (process.env.SITE_URL || "https://simba.profiya.com").replace(/\/$/, "");

/** Datos del restaurante para la página pública. */
export const SITE = {
  name: "Simba",
  /** Otros nombres con que lo buscan (ficha de Google, Instagram) */
  alternateNames: ["Simba Parrilla", "SIMBA - Restaurante y Comidas Rápidas"],
  tagline: "Un reino de sabores, carnes a la parrilla y hamburguesas dignas de un rey",
  specialties: ["Parrilla", "Hamburguesas", "Carne a la llanera"],
  address: "Vía Guatiguará",
  city: "Piedecuesta, Santander",
  instagram: "https://www.instagram.com/simba_parrilla/",
  instagramHandle: "@simba_parrilla",
  /** Ficha en Google Maps (por su CID) */
  googleMaps: "https://www.google.com/maps?cid=15014617146106181898",
  /** Ubicación del restaurante (Google Maps) */
  geo: { lat: 7.0012835, lng: -73.0581301 },
};

export const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${SITE.geo.lat},${SITE.geo.lng}`;
export const MAPS_EMBED_URL = `https://maps.google.com/maps?q=${SITE.geo.lat},${SITE.geo.lng}&z=16&output=embed`;

/** Miles con punto siempre ("3.000", "26.000"), sin depender de los datos regionales del servidor. */
export function formatPesos(pesos: number) {
  return String(Math.round(pesos)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type HoursRow = { days: string; hours: string | null; closed: boolean };

/**
 * Horario de la semana agrupando días seguidos iguales:
 * "Martes a sábado · 12:00 p. m. a 10:00 p. m.", "Lunes · Cerrado".
 * Un día abierto sin horario configurado queda con hours null.
 */
export function weeklyHours(openingHours: string[], closedWeekdays: number[]): HoursRow[] {
  const value = (d: number) => {
    if (closedWeekdays.includes(d)) return "closed";
    const h = parseHours(openingHours[d]);
    return h ? formatHours(h) : "";
  };
  const rows: { from: number; to: number; value: string }[] = [];
  for (const d of WEEK_ORDER) {
    const last = rows.at(-1);
    if (last && last.value === value(d)) last.to = d;
    else rows.push({ from: d, to: d, value: value(d) });
  }
  return rows.map(({ from, to, value }) => {
    const span = WEEK_ORDER.indexOf(to) - WEEK_ORDER.indexOf(from);
    const days =
      span === 0
        ? capital(DAY_NAMES[from])
        : `${capital(DAY_NAMES[from])} ${span === 1 ? "y" : "a"} ${DAY_NAMES[to]}`;
    return { days, hours: value && value !== "closed" ? value : null, closed: value === "closed" };
  });
}

/** Horario de festivos, si se configuró. */
export function holidayHours(openingHours: string[]) {
  const h = parseHours(openingHours[HOLIDAY_ROW]);
  return h ? formatHours(h) : null;
}

export type ReservationRequest = {
  name: string;
  date: ISODate;
  time: string;
  people: number;
  occasion: string;
  honoree: string;
  note: string;
};

/** Mensaje que el cliente envía al WhatsApp del restaurante. No se guarda nada en el sistema. */
export function reservationRequestMessage(r: ReservationRequest, restaurant: string, timeLabel: string) {
  const occasion = occasionLabel(r.occasion.trim() || null, r.honoree.trim() || null);
  return [
    `Hola ${restaurant} 👋 Quiero hacer una reserva:`,
    "",
    `👤 A nombre de: ${r.name.trim()}`,
    `📅 ${capital(formatDayMonth(r.date))}`,
    `🕖 ${timeLabel}`,
    `👥 ${r.people} ${r.people === 1 ? "persona" : "personas"}`,
    ...(occasion ? [`🎉 ${occasion}`] : []),
    ...(r.note.trim() ? [`📝 ${r.note.trim()}`] : []),
    "",
    "¿Me confirman, por favor?",
  ].join("\n");
}

export function orderMessage(restaurant: string) {
  return `Hola ${restaurant} 👋 Quiero hacer un pedido.`;
}
