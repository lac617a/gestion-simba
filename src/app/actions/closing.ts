"use server";

import { revalidatePath } from "next/cache";
import { checkClose } from "@/lib/closing";
import { CURRENCY, today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isISODate, isoToDate } from "@/lib/dates";
import { parseMoney, toDecimalString } from "@/lib/money";
import { loadDayRows, openWorkDay } from "@/lib/workdays";

export type CloseDayValues = { totalSales: string; tipsTotal: string; note: string };
export type CloseDayState =
  | {
      errors?: Partial<Record<keyof CloseDayValues, string>>;
      message?: string;
      values?: CloseDayValues;
    }
  | undefined;

/**
 * Cierra el día: guarda venta y propinas, calcula y guarda el reparto.
 * Todo en una transacción, y solo si el día sigue abierto.
 */
export async function closeDay(date: string, _prev: CloseDayState, formData: FormData): Promise<CloseDayState> {
  await verifySession();
  const values: CloseDayValues = {
    totalSales: String(formData.get("totalSales") ?? "").trim(),
    tipsTotal: String(formData.get("tipsTotal") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim().slice(0, 300),
  };
  const fail = (s: Omit<NonNullable<CloseDayState>, "values">): CloseDayState => ({ ...s, values });

  if (!isISODate(date) || date > today()) return fail({ message: "No se puede cerrar un día futuro." });

  const d = CURRENCY.decimals;
  const totalSales = parseMoney(values.totalSales, d);
  const tipsTotal = values.tipsTotal === "" ? 0 : parseMoney(values.tipsTotal, d);
  const errors: NonNullable<CloseDayState>["errors"] = {};
  if (values.totalSales === "") errors.totalSales = "Escribe la venta total del día";
  else if (totalSales === null) errors.totalSales = "Monto inválido";
  if (tipsTotal === null) errors.tipsTotal = "Monto inválido";
  if (Object.keys(errors).length) return fail({ errors });

  // Asegura que empleados agregados después de abrir el día tengan su fila.
  const { id: workDayId } = await openWorkDay(date);

  const result = await db.$transaction(async (tx) => {
    const rows = await loadDayRows(tx, workDayId);
    const check = checkClose(rows, tipsTotal!);
    if (!check.ok) return check;

    const { count } = await tx.workDay.updateMany({
      where: { id: workDayId, status: "OPEN" },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        totalSales: toDecimalString(totalSales!, d),
        tipsTotal: toDecimalString(tipsTotal!, d),
        note: values.note || null,
      },
    });
    if (count === 0) return { ok: false as const, error: "Este día ya estaba cerrado." };

    await tx.tipShare.deleteMany({ where: { workDayId } });
    if (check.shares.length) {
      await tx.tipShare.createMany({
        data: check.shares.map((s) => ({
          workDayId,
          employeeId: s.employeeId,
          amount: toDecimalString(s.amount, d),
        })),
      });
    }
    return check;
  });

  if (!result.ok) return fail({ message: result.error });
  revalidatePath("/asistencia");
  return undefined;
}

/** Reabre un día cerrado. Se borra el reparto; se recalcula al volver a cerrar. */
export async function reopenDay(date: string) {
  await verifySession();
  if (!isISODate(date)) return;
  const day = await db.workDay.findUnique({ where: { date: isoToDate(date) }, select: { id: true } });
  if (!day) return;

  await db.$transaction([
    db.workDay.update({ where: { id: day.id }, data: { status: "OPEN", closedAt: null } }),
    db.tipShare.deleteMany({ where: { workDayId: day.id } }),
  ]);
  revalidatePath("/asistencia");
}
