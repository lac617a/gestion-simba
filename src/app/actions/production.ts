"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { CURRENCY, DEFAULT_PAY_WEEK_START } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { withAviso } from "@/lib/search-params";
import { db } from "@/lib/db";
import { formatLongDate, isoToDate } from "@/lib/dates";
import { parseMoney, toDecimalString } from "@/lib/money";
import { parseProductionForm } from "@/lib/production";
import { employeeNames, getProductionDay } from "@/lib/production-data";
import { diffProduction, productionSnapshot, type ProductionSnapshot } from "@/lib/production-log";
import { getSettings } from "@/lib/settings";

export type ProductionFormValues = {
  date: string;
  note: string;
  employeeIds: string[];
  /** Excedente escrito por empleado (texto) */
  extras: Record<string, string>;
};
export type ProductionFormState =
  | { error?: string; extraErrors?: Record<string, string>; values?: ProductionFormValues }
  | undefined;

function submittedValues(formData: FormData): ProductionFormValues {
  const employeeIds = formData.getAll("employeeId").map(String);
  return {
    date: String(formData.get("date") ?? ""),
    note: String(formData.get("note") ?? ""),
    employeeIds,
    extras: Object.fromEntries(employeeIds.map((id) => [id, String(formData.get(`extra_${id}`) ?? "")])),
  };
}

function refresh() {
  revalidatePath("/gestion/produccion", "layout");
  revalidatePath("/gestion/pagos");
  revalidatePath("/gestion"); // "Por pagar" de la semana en Hoy
}

const d = CURRENCY.decimals;
const money = (minor: number) => toDecimalString(minor, d);
const json = (s: ProductionSnapshot) => s as Prisma.InputJsonValue;
const MISSING_EMPLOYEE = "Alguno de los asistentes ya no existe. Recarga la página.";

/** Otra jornada ya ocupa esa fecha (una por día). */
async function dateTaken(date: string, exceptId?: string) {
  const other = await db.productionDay.findUnique({ where: { date: isoToDate(date) }, select: { id: true } });
  return other && other.id !== exceptId ? `Ya hay una jornada de producción el ${formatLongDate(date)}. Edítala en la lista.` : null;
}

export async function createProductionDay(_prev: ProductionFormState, formData: FormData): Promise<ProductionFormState> {
  const user = await verifyAdmin();
  const parsed = parseProductionForm(formData, d);
  if (!parsed.success) return { error: parsed.error, extraErrors: parsed.extraErrors, values: submittedValues(formData) };
  const { date, note, attendees } = parsed.data;
  const taken = await dateTaken(date);
  if (taken) return { error: taken, values: submittedValues(formData) };
  const names = await employeeNames(attendees.map((a) => a.employeeId));
  if (names.size < attendees.length) return { error: MISSING_EMPLOYEE, values: submittedValues(formData) };

  // El pago fijo se guarda en cada asistente: si luego cambia en Configuración, el historial no cambia.
  const basePay = (await getSettings()).productionPay;
  const after = productionSnapshot({
    date,
    note,
    attendees: attendees.map((a) => ({ ...a, name: names.get(a.employeeId)!, basePay })),
  });
  await db.productionDay.create({
    data: {
      date: isoToDate(date),
      note,
      attendees: {
        create: attendees.map((a) => ({ employeeId: a.employeeId, basePay: money(basePay), extraPay: money(a.extraPay) })),
      },
      logs: { create: { userId: user.userId, action: "CREATED", date: isoToDate(date), after: json(after) } },
    },
  });
  refresh();
  redirect(withAviso("/gestion/produccion", { aviso: "creado" }));
}

export async function updateProductionDay(
  id: string,
  _prev: ProductionFormState,
  formData: FormData
): Promise<ProductionFormState> {
  const user = await verifyAdmin();
  const parsed = parseProductionForm(formData, d);
  if (!parsed.success) return { error: parsed.error, extraErrors: parsed.extraErrors, values: submittedValues(formData) };
  const { date, note, attendees } = parsed.data;

  const saved = await getProductionDay(id);
  if (!saved) return { error: "La jornada ya no existe.", values: submittedValues(formData) };
  const taken = await dateTaken(date, id);
  if (taken) return { error: taken, values: submittedValues(formData) };

  const before = new Map(saved.attendees.map((a) => [a.employeeId, a]));
  const newIds = attendees.filter((a) => !before.has(a.employeeId)).map((a) => a.employeeId);
  const names = await employeeNames(newIds);
  if (names.size < newIds.length) return { error: MISSING_EMPLOYEE, values: submittedValues(formData) };
  // Los que ya estaban conservan su pago fijo (solo cambia el excedente); los nuevos entran con el de hoy.
  const basePay = (await getSettings()).productionPay;
  const now = attendees.map((a) => {
    const prev = before.get(a.employeeId);
    return { ...a, name: prev?.name ?? names.get(a.employeeId)!, basePay: prev?.basePay ?? basePay };
  });
  const snapshots = { before: productionSnapshot(saved), after: productionSnapshot({ date, note, attendees: now }) };

  // Sin cambios no se guarda nada (ni historial).
  if (diffProduction(snapshots.before, snapshots.after).length) {
    await db.$transaction([
      db.productionDay.update({ where: { id }, data: { date: isoToDate(date), note } }),
      db.productionAttendance.deleteMany({
        where: { productionDayId: id, employeeId: { notIn: now.map((a) => a.employeeId) } },
      }),
      ...now
        .filter((a) => before.has(a.employeeId) && before.get(a.employeeId)!.extraPay !== a.extraPay)
        .map((a) =>
          db.productionAttendance.update({
            where: { productionDayId_employeeId: { productionDayId: id, employeeId: a.employeeId } },
            data: { extraPay: money(a.extraPay) },
          })
        ),
      db.productionAttendance.createMany({
        data: now
          .filter((a) => !before.has(a.employeeId))
          .map((a) => ({ productionDayId: id, employeeId: a.employeeId, basePay: money(a.basePay), extraPay: money(a.extraPay) })),
      }),
      db.productionLog.create({
        data: {
          productionDayId: id,
          userId: user.userId,
          action: "UPDATED",
          date: isoToDate(date),
          before: json(snapshots.before),
          after: json(snapshots.after),
        },
      }),
    ]);
  }
  refresh();
  redirect(withAviso("/gestion/produccion", { aviso: "actualizado" }));
}

export async function deleteProductionDay(id: string) {
  const user = await verifyAdmin();
  const saved = await getProductionDay(id);
  if (saved) {
    // Se borra con sus asistentes; en el historial queda qué tenía y quién la eliminó.
    await db.$transaction([
      db.productionLog.create({
        data: { userId: user.userId, action: "DELETED", date: isoToDate(saved.date), before: json(productionSnapshot(saved)) },
      }),
      db.productionDay.deleteMany({ where: { id } }),
    ]);
  }
  refresh();
  redirect(withAviso("/gestion/produccion", { aviso: "eliminado" }));
}

export type ProductionPayState = { error?: string; success?: string } | undefined;

/** Pago fijo por jornada de producción (Configuración). Solo afecta las jornadas que se registren después. */
export async function saveProductionPay(_prev: ProductionPayState, formData: FormData): Promise<ProductionPayState> {
  await verifyAdmin();
  const amount = parseMoney(String(formData.get("productionPay") ?? ""), d);
  if (amount === null || amount <= 0) return { error: "Escribe el pago de producción." };
  await db.appSettings.upsert({
    where: { id: 1 },
    update: { productionPay: money(amount) },
    create: { id: 1, payWeekStart: DEFAULT_PAY_WEEK_START, productionPay: money(amount) },
  });
  revalidatePath("/gestion", "layout");
  return { success: "Pago de producción guardado." };
}
