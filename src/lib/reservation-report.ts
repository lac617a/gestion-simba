import type { ReservationStatus } from "@/generated/prisma/enums";
import { toCsv } from "@/lib/csv";
import { weekdayOf, type ISODate } from "@/lib/dates";
import { formatTime } from "@/lib/hours";
import type { Period } from "@/lib/periods";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations";

export type ReservationRecord = {
  date: ISODate;
  time: string;
  partySize: number;
  status: ReservationStatus;
  customerName: string;
  phone: string | null;
  occasion: string | null;
  honoree: string | null;
  note: string | null;
};

export type Bucket = { label: string; count: number; people: number };

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function group<K>(records: ReservationRecord[], key: (r: ReservationRecord) => K) {
  const map = new Map<K, { count: number; people: number }>();
  for (const r of records) {
    const acc = map.get(key(r)) ?? { count: 0, people: 0 };
    acc.count++;
    acc.people += r.partySize;
    map.set(key(r), acc);
  }
  return map;
}

/**
 * Reporte de reservas del periodo (RF-15). Las canceladas no cuentan en
 * totales ni agrupaciones; se informan aparte.
 * - upcoming: confirmadas de hoy en adelante
 * - unmarked: confirmadas de días pasados sin marcar Llegó / No vino
 */
export function summarizeReservations(records: ReservationRecord[], today: ISODate) {
  const active = records.filter((r) => r.status !== "CANCELLED");
  const count = (s: ReservationStatus, when?: (r: ReservationRecord) => boolean) =>
    records.filter((r) => r.status === s && (!when || when(r))).length;

  const people = active.reduce((sum, r) => sum + r.partySize, 0);
  const arrived = count("ARRIVED");
  const noShow = count("NO_SHOW");

  const weekdays = group(active, (r) => weekdayOf(r.date));
  const hours = group(active, (r) => r.time.slice(0, 2));
  const occasions = group(active, (r) => r.occasion ?? "");

  return {
    totals: {
      count: active.length,
      people,
      /** Personas por reserva, con un decimal */
      avgParty: active.length ? Math.round((people / active.length) * 10) / 10 : 0,
    },
    status: {
      arrived,
      noShow,
      cancelled: count("CANCELLED"),
      upcoming: count("CONFIRMED", (r) => r.date >= today),
      unmarked: count("CONFIRMED", (r) => r.date < today),
      peopleArrived: records.filter((r) => r.status === "ARRIVED").reduce((sum, r) => sum + r.partySize, 0),
      /** Llegaron / (llegaron + no vinieron), en %; null si no se ha marcado ninguna */
      showRate: arrived + noShow > 0 ? Math.round((arrived / (arrived + noShow)) * 100) : null,
    },
    byWeekday: WEEKDAY_ORDER.filter((d) => weekdays.has(d)).map(
      (d): Bucket => ({ label: WEEKDAY_LABEL[d], ...weekdays.get(d)! })
    ),
    byHour: [...hours.keys()]
      .sort()
      .map((h): Bucket => ({ label: formatTime(`${h}:00`), ...hours.get(h)! })),
    /** Más frecuentes primero; "Sin ocasión" al final */
    byOccasion: [...occasions.entries()]
      .sort(([a, x], [b, y]) => Number(a === "") - Number(b === "") || y.count - x.count || a.localeCompare(b))
      .map(([label, v]): Bucket => ({ label: label || "Sin ocasión", ...v })),
    records: [...records].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
  };
}

export type ReservationReport = ReturnType<typeof summarizeReservations>;

export function reservationsCsv(r: ReservationReport, p: Period) {
  return toCsv([
    ["Periodo", `${p.from} a ${p.to}`],
    [],
    ["Fecha", "Hora", "A nombre de", "Teléfono", "Personas", "Ocasión", "Persona de la ocasión", "Estado", "Observación"],
    ...r.records.map((x) => [
      x.date,
      x.time,
      x.customerName,
      x.phone ?? "",
      x.partySize,
      x.occasion ?? "",
      x.honoree ?? "",
      RESERVATION_STATUS_LABEL[x.status],
      x.note ?? "",
    ]),
    [],
    ["Reservas (sin canceladas)", r.totals.count],
    ["Personas", r.totals.people],
    ["Llegaron", r.status.arrived],
    ["No vinieron", r.status.noShow],
    ["Canceladas", r.status.cancelled],
  ]);
}
