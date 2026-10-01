"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { nowLocal } from "@/lib/config";
import { verifyReservations } from "@/lib/dal";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { removeReservationCalendar, syncReservationCalendar } from "@/lib/calendar-data";
import { cancelReservationReminder, syncReservationReminder } from "@/lib/reminders-data";
import { diffReservation, type LogChange } from "@/lib/reservation-log";
import { isPastSlot, PAST_GRACE_MINUTES } from "@/lib/reservation-slots";
import { parseReservationForm, RESERVATION_STATUS_LABEL, type ReservationFieldErrors } from "@/lib/reservations";

export type ReservationFormValues = {
  customerName: string;
  phone: string;
  partySize: string;
  date: string;
  time: string;
  occasionChoice: string;
  occasionOther: string;
  honoree: string;
  note: string;
};

export type ReservationFormState =
  | { errors?: ReservationFieldErrors; message?: string; values?: ReservationFormValues }
  | undefined;

/** Lo enviado, para volver a mostrarlo si hay error (React vacía el form tras la acción). */
function submittedValues(formData: FormData): ReservationFormValues {
  const get = (k: string) => String(formData.get(k) ?? "");
  return {
    customerName: get("customerName"),
    phone: get("phone"),
    partySize: get("partySize"),
    date: get("date"),
    time: get("time"),
    occasionChoice: get("occasionChoice"),
    occasionOther: get("occasionOther"),
    honoree: get("honoree"),
    note: get("note"),
  };
}

/** Error si la fecha u hora ya pasaron (no se anotan reservas hacia atrás). */
function pastError(date: string, time: string): ReservationFieldErrors | null {
  const now = nowLocal();
  if (date < now.date) return { date: ["Esa fecha ya pasó"] };
  if (isPastSlot(date, time, now, PAST_GRACE_MINUTES)) return { time: ["Esa hora ya pasó: elige una desde ahora"] };
  return null;
}

function refresh() {
  revalidatePath("/gestion/reservas", "layout");
  revalidatePath("/gestion");
}

export async function createReservation(_prev: ReservationFormState, formData: FormData): Promise<ReservationFormState> {
  const user = await verifyReservations();
  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  const { date, ...data } = parsed.data;
  const past = pastError(date, data.time);
  if (past) return { errors: past, values: submittedValues(formData) };
  const created = await db.reservation.create({
    data: {
      ...data,
      date: isoToDate(date),
      createdById: user.userId,
      logs: { create: { userId: user.userId, action: "CREATED" } },
    },
  });
  await syncReservationReminder(created.id);
  await syncReservationCalendar(created.id);
  refresh();
  redirect(`/gestion/reservas?creado=1#dia-${date}`);
}

export async function updateReservation(
  id: string,
  _prev: ReservationFormState,
  formData: FormData
): Promise<ReservationFormState> {
  const user = await verifyReservations();
  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  const { date, ...data } = parsed.data;
  const saved = await db.reservation.findUnique({
    where: { id },
    // Los datos que compara el historial (LOGGED_FIELDS)
    select: { date: true, time: true, partySize: true, customerName: true, phone: true, occasion: true, honoree: true, note: true },
  });
  if (!saved) return { message: "La reserva ya no existe", values: submittedValues(formData) };
  // Una reserva vieja se puede corregir (nota, teléfono…) sin moverla; si se mueve, no hacia atrás.
  const moved = dateToISO(saved.date) !== date || saved.time !== data.time;
  const past = moved ? pastError(date, data.time) : null;
  if (past) return { errors: past, values: submittedValues(formData) };

  const changes = diffReservation({ ...saved, date: dateToISO(saved.date) }, { ...data, date });
  // Sin cambios no se guarda nada (ni historial, ni correos).
  if (changes.length) {
    await db.reservation.update({
      where: { id },
      data: {
        ...data,
        date: isoToDate(date),
        logs: { create: { userId: user.userId, action: "UPDATED", changes: changes as Prisma.InputJsonValue } },
      },
    });
    // Con los datos nuevos (o cancelado si ya no aplica).
    await syncReservationReminder(id);
    await syncReservationCalendar(id);
  }

  refresh();
  redirect(`/gestion/reservas?actualizado=1#dia-${date}`);
}

const STATUSES = Object.keys(RESERVATION_STATUS_LABEL) as ReservationStatus[];

/** Llegó / No vino / Cancelada, o de vuelta a Confirmada. */
export async function setReservationStatus(id: string, status: ReservationStatus) {
  const user = await verifyReservations();
  if (!STATUSES.includes(status)) return { ok: false as const, error: "Estado inválido" };
  const saved = await db.reservation.findUnique({ where: { id }, select: { status: true } });
  if (!saved) return { ok: false as const, error: "La reserva ya no existe" };
  if (saved.status === status) return { ok: true as const };
  const change: LogChange = { field: "status", from: saved.status, to: status };
  await db.reservation.update({
    where: { id },
    data: { status, logs: { create: { userId: user.userId, action: "STATUS", changes: [change] as Prisma.InputJsonValue } } },
  });
  // Cancelada, llegó o no vino: sin recordatorio. De vuelta a confirmada: se programa otra vez.
  await syncReservationReminder(id);
  // Cancelada: se quita del calendario; de vuelta a confirmada: vuelve.
  await syncReservationCalendar(id);
  refresh();
  return { ok: true as const };
}

/** Borra la reserva (para las registradas por error; si no vinieron es mejor marcar "No vino"). */
export async function deleteReservation(id: string) {
  await verifyReservations();
  await cancelReservationReminder(id);
  await removeReservationCalendar(id);
  await db.reservation.deleteMany({ where: { id } });
  refresh();
  redirect("/gestion/reservas?eliminado=1");
}
