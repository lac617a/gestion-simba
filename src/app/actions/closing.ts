"use server";

import { revalidatePath } from "next/cache";
import { checkClose, checkMorningClose, parsePays } from "@/lib/closing";
import { CURRENCY, today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isISODate, isoToDate } from "@/lib/dates";
import { fromDecimal, parseMoney, toDecimalString } from "@/lib/money";
import { loadDayRows, openWorkDay } from "@/lib/workdays";

type TipField = "tipsTotal" | "tipsMorning" | "tipsEvening";

export type CloseDayValues = {
  totalSales: string;
  tipsTotal: string;
  tipsMorning: string;
  tipsEvening: string;
  note: string;
  /** Pago del día escrito por empleado (employeeId → texto) */
  pays: Record<string, string>;
};
export type CloseDayState =
  | {
      errors?: Partial<Record<"totalSales" | TipField, string>> & { pays?: Record<string, string> };
      message?: string;
      values?: CloseDayValues;
    }
  | undefined;

/** Monto de propinas del formulario: vacío = 0; null si no es un monto válido. */
function tipAmount(value: string) {
  return value === "" ? 0 : parseMoney(value, CURRENCY.decimals);
}

/**
 * Cierra el día: guarda venta, propinas y el pago del día de cada empleado,
 * y calcula y guarda el reparto. Todo en una transacción, y solo si el día sigue abierto.
 * En días de doble turno las propinas son por turno (las de la mañana ya pueden
 * estar guardadas por el cierre del turno de la mañana).
 */
export async function closeDay(date: string, _prev: CloseDayState, formData: FormData): Promise<CloseDayState> {
  await verifySession();
  const raw = (field: string) => String(formData.get(field) ?? "");
  const values: CloseDayValues = {
    totalSales: raw("totalSales").trim(),
    tipsTotal: raw("tipsTotal").trim(),
    tipsMorning: raw("tipsMorning").trim(),
    tipsEvening: raw("tipsEvening").trim(),
    note: raw("note").trim().slice(0, 300),
    pays: Object.fromEntries(
      [...formData.keys()].filter((k) => k.startsWith("pay_")).map((k) => [k.slice(4), raw(k)])
    ),
  };
  const fail = (s: Omit<NonNullable<CloseDayState>, "values">): CloseDayState => ({ ...s, values });

  if (!isISODate(date) || date > today()) return fail({ message: "No se puede cerrar un día futuro." });

  // Asegura que empleados agregados después de abrir el día tengan su fila.
  const opened = await openWorkDay(date);
  if (!opened) return fail({ message: "Este día está marcado como cerrado. Ábrelo en Asistencia para registrarlo." });
  const workDayId = opened.id;
  const double = opened.doubleShift;
  const morningClosed = !!opened.morningClosedAt;

  const d = CURRENCY.decimals;
  const totalSales = parseMoney(values.totalSales, d);
  const errors: NonNullable<CloseDayState>["errors"] = {};
  if (values.totalSales === "") errors.totalSales = "Escribe la venta total del día";
  else if (totalSales === null) errors.totalSales = "Monto inválido";

  // Doble turno: la mañana viene del cierre del turno (si se hizo) o del formulario.
  const tips: Partial<Record<TipField, number | null>> = double
    ? {
        tipsMorning: morningClosed ? (fromDecimal(opened.tipsMorning, d) ?? 0) : tipAmount(values.tipsMorning),
        tipsEvening: tipAmount(values.tipsEvening),
      }
    : { tipsTotal: tipAmount(values.tipsTotal) };
  for (const [field, amount] of Object.entries(tips) as [TipField, number | null][]) {
    if (amount === null) errors[field] = "Monto inválido";
  }
  if (Object.keys(errors).length) return fail({ errors });

  const morning = tips.tipsMorning ?? 0;
  const evening = tips.tipsEvening ?? 0;
  const tipsTotal = double ? morning + evening : tips.tipsTotal!;

  const result = await db.$transaction(async (tx) => {
    const rows = await loadDayRows(tx, workDayId);
    const check = checkClose(rows, double ? { morning, evening } : tipsTotal);
    if (!check.ok) return check;
    const pays = parsePays(rows, raw, d);
    if (!pays.ok) return { ok: false as const, error: "Revisa el pago del día de cada empleado.", payErrors: pays.errors };

    const now = new Date();
    const { count } = await tx.workDay.updateMany({
      where: { id: workDayId, status: "OPEN" },
      data: {
        status: "CLOSED",
        closedAt: now,
        totalSales: toDecimalString(totalSales!, d),
        tipsTotal: toDecimalString(tipsTotal, d),
        ...(double && {
          tipsMorning: toDecimalString(morning, d),
          tipsEvening: toDecimalString(evening, d),
          morningClosedAt: opened.morningClosedAt ?? now,
        }),
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

    // Solo "Trabajó" se paga: se limpia el pago de quien cambió de estado tras reabrir.
    await tx.attendance.updateMany({
      where: { workDayId, status: { not: "WORKED" } },
      data: { dailyPay: null },
    });
    for (const [employeeId, amount] of pays.pays) {
      await tx.attendance.update({
        where: { workDayId_employeeId: { workDayId, employeeId } },
        data: { dailyPay: toDecimalString(amount, d) },
      });
    }
    return check;
  });

  if (!result.ok) {
    return fail({ message: result.error, errors: "payErrors" in result ? { pays: result.payErrors } : undefined });
  }
  revalidatePath("/gestion/asistencia");
  revalidatePath("/gestion");
  return undefined;
}

export type MorningCloseState = { error?: string; values?: { tipsMorning: string } } | undefined;

/**
 * Cierra el turno de la mañana (días de doble turno): guarda sus propinas y deja
 * fijo quién lo hizo. Las propinas se reparten entre ellos al cerrar el día.
 */
export async function closeMorningShift(date: string, _prev: MorningCloseState, formData: FormData): Promise<MorningCloseState> {
  await verifySession();
  const value = String(formData.get("tipsMorning") ?? "").trim();
  const fail = (error: string): MorningCloseState => ({ error, values: { tipsMorning: value } });
  if (!isISODate(date) || date > today()) return fail("No se puede cerrar un turno de un día futuro.");

  const tips = tipAmount(value);
  if (tips === null) return fail("Monto de propinas inválido.");

  const day = await db.workDay.findUnique({
    where: { date: isoToDate(date) },
    select: { id: true, status: true, doubleShift: true, morningClosedAt: true },
  });
  if (!day || day.status !== "OPEN") return fail("El día ya está cerrado.");
  if (!day.doubleShift) return fail("Este día no tiene doble turno.");
  if (day.morningClosedAt) return fail("El turno de la mañana ya estaba cerrado.");

  const check = checkMorningClose(await loadDayRows(db, day.id), tips);
  if (!check.ok) return fail(check.error);

  const { count } = await db.workDay.updateMany({
    where: { id: day.id, status: "OPEN", morningClosedAt: null },
    data: { tipsMorning: toDecimalString(tips, CURRENCY.decimals), morningClosedAt: new Date() },
  });
  if (count === 0) return fail("El turno de la mañana ya estaba cerrado.");
  revalidatePath("/gestion/asistencia");
  revalidatePath("/gestion");
  return undefined;
}

/** Reabre el turno de la mañana (con el día aún abierto) para corregir quién lo hizo o sus propinas. */
export async function reopenMorningShift(date: string) {
  await verifySession();
  if (!isISODate(date)) return;
  await db.workDay.updateMany({
    where: { date: isoToDate(date), status: "OPEN" },
    data: { morningClosedAt: null },
  });
  revalidatePath("/gestion/asistencia");
  revalidatePath("/gestion");
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
  revalidatePath("/gestion/asistencia");
}
