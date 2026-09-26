import "server-only";
import type { Prisma, Reservation } from "@/generated/prisma/client";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, type ISODate } from "@/lib/dates";
import { hoursFor, type OpeningHours } from "@/lib/hours";
import type { Period } from "@/lib/periods";
import { summarizeReservations } from "@/lib/reservation-report";
import { dayTotals, outsideHoursWarning } from "@/lib/reservations";
import { daySchedule, type DaySchedule } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";

export type ReservationRow = Omit<Reservation, "date" | "createdAt" | "updatedAt"> & {
  date: ISODate;
  /** Hora fuera del horario de atención */
  warning: string | null;
};

export type ReservationDay = {
  date: ISODate;
  schedule: DaySchedule;
  hours: OpeningHours | null;
  totals: { count: number; people: number };
  reservations: ReservationRow[];
};

/** Reservas agrupadas por día, con el horario y los avisos de cada uno. */
async function loadDays(where: Prisma.ReservationWhereInput, newestFirst: boolean, take?: number) {
  const orderDir = newestFirst ? "desc" : "asc";
  const rows = await db.reservation.findMany({
    where,
    orderBy: [{ date: orderDir }, { time: "asc" }, { createdAt: "asc" }],
    omit: { createdAt: true, updatedAt: true },
    take,
  });
  if (rows.length === 0) return [];

  const dates = [...new Set(rows.map((r) => dateToISO(r.date)))];
  const [settings, overrides] = await Promise.all([
    getSettings(),
    db.dayOverride.findMany({ where: { date: { in: dates.map(isoToDate) } }, select: { date: true, open: true } }),
  ]);
  const overrideOf = new Map(overrides.map((o) => [dateToISO(o.date), o.open]));

  return dates.map((date): ReservationDay => {
    const schedule = daySchedule(date, settings.closedWeekdays, overrideOf.get(date) ?? null);
    const hours = hoursFor(schedule, settings.openingHours);
    const reservations = rows
      .filter((r) => dateToISO(r.date) === date)
      .map((r) => ({
        ...r,
        date,
        // El día cerrado se avisa una vez, en el encabezado del día (hours es null).
        warning: r.status === "CANCELLED" ? null : outsideHoursWarning(hours, r.time),
      }));
    return { date, schedule, hours, totals: dayTotals(reservations), reservations };
  });
}

/** Busca por quien reserva o por la persona de la ocasión. */
const search = (q: string): Prisma.ReservationWhereInput =>
  q
    ? {
        OR: [
          { customerName: { contains: q, mode: "insensitive" } },
          { honoree: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

/** Desde hoy en adelante, de la más próxima a la más lejana. */
export function getUpcomingReservations(today: ISODate, q = "") {
  return loadDays({ date: { gte: isoToDate(today) }, ...search(q) }, false);
}

/** Antes de hoy, de la más reciente hacia atrás (las últimas 200). */
export function getPastReservations(today: ISODate, q = "") {
  return loadDays({ date: { lt: isoToDate(today) }, ...search(q) }, true, 200);
}

/** Reservas de un día (Hoy). */
export async function getReservationsOn(date: ISODate) {
  const [day] = await loadDays({ date: isoToDate(date) }, false);
  return day ?? null;
}

export async function getReservation(id: string) {
  const r = await db.reservation.findUnique({ where: { id } });
  return r && { ...r, date: dateToISO(r.date) };
}

/** Reporte de reservas del periodo (Reportes). */
export async function getReservationReport(period: Period) {
  const rows = await db.reservation.findMany({
    where: { date: { gte: isoToDate(period.from), lte: isoToDate(period.to) } },
    omit: { id: true, createdAt: true, updatedAt: true },
  });
  return summarizeReservations(
    rows.map((r) => ({ ...r, date: dateToISO(r.date) })),
    today()
  );
}
