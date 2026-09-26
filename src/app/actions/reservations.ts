"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isoToDate } from "@/lib/dates";
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

function refresh() {
  revalidatePath("/reservas", "layout");
  revalidatePath("/");
}

export async function createReservation(_prev: ReservationFormState, formData: FormData): Promise<ReservationFormState> {
  await verifySession();
  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  const { date, ...data } = parsed.data;
  await db.reservation.create({ data: { ...data, date: isoToDate(date) } });
  refresh();
  redirect(`/reservas?creado=1#dia-${date}`);
}

export async function updateReservation(
  id: string,
  _prev: ReservationFormState,
  formData: FormData
): Promise<ReservationFormState> {
  await verifySession();
  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  const { date, ...data } = parsed.data;
  const { count } = await db.reservation.updateMany({ where: { id }, data: { ...data, date: isoToDate(date) } });
  if (count === 0) return { message: "La reserva ya no existe", values: submittedValues(formData) };

  refresh();
  redirect(`/reservas?actualizado=1#dia-${date}`);
}

const STATUSES = Object.keys(RESERVATION_STATUS_LABEL) as ReservationStatus[];

/** Llegó / No vino / Cancelada, o de vuelta a Confirmada. */
export async function setReservationStatus(id: string, status: ReservationStatus) {
  await verifySession();
  if (!STATUSES.includes(status)) return { ok: false as const, error: "Estado inválido" };
  const { count } = await db.reservation.updateMany({ where: { id }, data: { status } });
  if (count === 0) return { ok: false as const, error: "La reserva ya no existe" };
  refresh();
  return { ok: true as const };
}

/** Borra la reserva (para las registradas por error; si no vinieron es mejor marcar "No vino"). */
export async function deleteReservation(id: string) {
  await verifySession();
  await db.reservation.deleteMany({ where: { id } });
  refresh();
  redirect("/reservas?eliminado=1");
}
