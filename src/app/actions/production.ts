"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CURRENCY, DEFAULT_PAY_WEEK_START } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatLongDate, isoToDate } from "@/lib/dates";
import { parseMoney, toDecimalString } from "@/lib/money";
import { parseProductionForm } from "@/lib/production";
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

/** Otra jornada ya ocupa esa fecha (una por día). */
async function dateTaken(date: string, exceptId?: string) {
  const other = await db.productionDay.findUnique({ where: { date: isoToDate(date) }, select: { id: true } });
  return other && other.id !== exceptId ? `Ya hay una jornada de producción el ${formatLongDate(date)}. Edítala en la lista.` : null;
}

export async function createProductionDay(_prev: ProductionFormState, formData: FormData): Promise<ProductionFormState> {
  await verifyAdmin();
  const parsed = parseProductionForm(formData, d);
  if (!parsed.success) return { error: parsed.error, extraErrors: parsed.extraErrors, values: submittedValues(formData) };
  const { date, note, attendees } = parsed.data;
  const taken = await dateTaken(date);
  if (taken) return { error: taken, values: submittedValues(formData) };

  // El pago fijo se guarda en cada asistente: si luego cambia en Configuración, el historial no cambia.
  const basePay = money((await getSettings()).productionPay);
  await db.productionDay.create({
    data: {
      date: isoToDate(date),
      note,
      attendees: { create: attendees.map((a) => ({ employeeId: a.employeeId, basePay, extraPay: money(a.extraPay) })) },
    },
  });
  refresh();
  redirect("/gestion/produccion?creado=1");
}

export async function updateProductionDay(
  id: string,
  _prev: ProductionFormState,
  formData: FormData
): Promise<ProductionFormState> {
  await verifyAdmin();
  const parsed = parseProductionForm(formData, d);
  if (!parsed.success) return { error: parsed.error, extraErrors: parsed.extraErrors, values: submittedValues(formData) };
  const { date, note, attendees } = parsed.data;

  const day = await db.productionDay.findUnique({
    where: { id },
    select: { attendees: { select: { employeeId: true } } },
  });
  if (!day) return { error: "La jornada ya no existe.", values: submittedValues(formData) };
  const taken = await dateTaken(date, id);
  if (taken) return { error: taken, values: submittedValues(formData) };

  const before = new Set(day.attendees.map((a) => a.employeeId));
  const now = new Set(attendees.map((a) => a.employeeId));
  const basePay = money((await getSettings()).productionPay);

  await db.$transaction([
    db.productionDay.update({ where: { id }, data: { date: isoToDate(date), note } }),
    db.productionAttendance.deleteMany({ where: { productionDayId: id, employeeId: { notIn: [...now] } } }),
    // Los que ya estaban conservan su pago fijo; solo cambia el excedente.
    ...attendees
      .filter((a) => before.has(a.employeeId))
      .map((a) =>
        db.productionAttendance.update({
          where: { productionDayId_employeeId: { productionDayId: id, employeeId: a.employeeId } },
          data: { extraPay: money(a.extraPay) },
        })
      ),
    db.productionAttendance.createMany({
      data: attendees
        .filter((a) => !before.has(a.employeeId))
        .map((a) => ({ productionDayId: id, employeeId: a.employeeId, basePay, extraPay: money(a.extraPay) })),
    }),
  ]);
  refresh();
  redirect("/gestion/produccion?actualizado=1");
}

export async function deleteProductionDay(id: string) {
  await verifyAdmin();
  await db.productionDay.deleteMany({ where: { id } }); // borra también sus asistentes
  refresh();
  redirect("/gestion/produccion?eliminado=1");
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
