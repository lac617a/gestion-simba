"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { initialStatus, parseTimeOffForm, TIME_OFF_LABEL, type TimeOffFieldErrors } from "@/lib/attendance";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";

export type TimeOffFormValues = { type: string; startDate: string; endDate: string; note: string };

export type TimeOffFormState =
  | { errors?: TimeOffFieldErrors; message?: string; success?: string; values?: TimeOffFormValues }
  | undefined;

/** Lo enviado, para volver a mostrarlo si hay error (React vacía el form tras la acción). */
function submittedValues(formData: FormData): TimeOffFormValues {
  const get = (k: string) => String(formData.get(k) ?? "");
  return { type: get("type"), startDate: get("startDate"), endDate: get("endDate"), note: get("note") };
}

/**
 * Asigna días libres. Si alguno de esos días ya estaba abierto, los registros
 * aún "Pendiente" pasan al nuevo estado (lo marcado a mano no se toca).
 */
export async function createTimeOff(
  employeeId: string,
  _prev: TimeOffFormState,
  formData: FormData
): Promise<TimeOffFormState> {
  await verifySession();
  const parsed = parseTimeOffForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  const { type, startDate, endDate, note } = parsed.data;
  const start = isoToDate(startDate);
  const end = isoToDate(endDate);

  const employee = await db.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) return { message: "El empleado ya no existe", values: submittedValues(formData) };

  await db.$transaction([
    db.timeOff.create({ data: { employeeId, type, startDate: start, endDate: end, note } }),
    db.attendance.updateMany({
      where: {
        employeeId,
        status: "PENDING",
        workDay: { status: "OPEN", date: { gte: start, lte: end } },
      },
      data: { status: type },
    }),
  ]);

  revalidatePath(`/gestion/empleados/${employeeId}`);
  revalidatePath("/gestion/asistencia");
  return { success: `${TIME_OFF_LABEL[type]} asignado` };
}

/**
 * Quita una asignación. En los días abiertos donde el empleado sigue con ese
 * estado, se recalcula el estado inicial (descanso fijo, otro día libre o pendiente).
 */
export async function deleteTimeOff(id: string) {
  await verifySession();
  const timeOff = await db.timeOff.findUnique({ where: { id } });
  if (!timeOff) return;

  await db.$transaction(async (tx) => {
    await tx.timeOff.delete({ where: { id } });

    const affected = await tx.attendance.findMany({
      where: {
        employeeId: timeOff.employeeId,
        status: timeOff.type,
        workDay: { status: "OPEN", date: { gte: timeOff.startDate, lte: timeOff.endDate } },
      },
      select: { id: true, workDay: { select: { date: true } } },
    });
    if (!affected.length) return;

    const employee = await tx.employee.findUniqueOrThrow({
      where: { id: timeOff.employeeId },
      select: {
        restDays: true,
        timeOff: {
          where: { startDate: { lte: timeOff.endDate }, endDate: { gte: timeOff.startDate } },
          select: { type: true, startDate: true, endDate: true },
        },
      },
    });
    const ranges = employee.timeOff.map((t) => ({
      type: t.type,
      startDate: dateToISO(t.startDate),
      endDate: dateToISO(t.endDate),
    }));

    for (const a of affected) {
      await tx.attendance.update({
        where: { id: a.id },
        data: { status: initialStatus(employee.restDays, dateToISO(a.workDay.date), ranges) },
      });
    }
  });

  revalidatePath(`/gestion/empleados/${timeOff.employeeId}`);
  revalidatePath("/gestion/asistencia");
}
