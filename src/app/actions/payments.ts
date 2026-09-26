"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions/attendance";
import { CURRENCY } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { dateToISO, isISODate, isoToDate } from "@/lib/dates";
import { formatMoney, toDecimalString } from "@/lib/money";
import { getPayroll } from "@/lib/payroll-data";

type PayResult = ActionResult & { count?: number };

function validPeriod(from: string, to: string) {
  return isISODate(from) && isISODate(to) && from <= to;
}

/**
 * Registra el pago de un empleado por todo el periodo. El monto se recalcula
 * en el servidor; si no coincide con el que vio el usuario (algo cambió), no paga.
 */
export async function markPaid(employeeId: string, from: string, to: string, expected: number): Promise<PayResult> {
  await verifySession();
  if (!validPeriod(from, to)) return { ok: false, error: "Periodo inválido" };

  const { summary } = await getPayroll({ from, to });
  const e = summary.employees.find((x) => x.employeeId === employeeId);
  if (!e || !e.canPay) {
    return { ok: false, error: "No hay nada que pagar o parte del periodo ya se pagó." };
  }
  if (e.total !== expected) {
    return {
      ok: false,
      error: `Los montos cambiaron (ahora ${formatMoney(e.total, CURRENCY)}). Revisa y vuelve a intentar.`,
    };
  }

  await db.payment.create({
    data: {
      employeeId,
      periodFrom: isoToDate(from),
      periodTo: isoToDate(to),
      amount: toDecimalString(e.total, CURRENCY.decimals),
    },
  });
  revalidatePath("/gestion/pagos");
  revalidatePath("/gestion");
  return { ok: true, count: 1 };
}

/** Marca como pagados a todos los que aún no tienen pago en el periodo. */
export async function markAllPaid(from: string, to: string, expectedPending: number): Promise<PayResult> {
  await verifySession();
  if (!validPeriod(from, to)) return { ok: false, error: "Periodo inválido" };

  const { summary } = await getPayroll({ from, to });
  const payable = summary.employees.filter((e) => e.canPay);
  const total = payable.reduce((s, e) => s + e.total, 0);
  if (payable.length === 0) return { ok: false, error: "No hay nada pendiente que se pueda pagar en este periodo." };
  if (total !== expectedPending) {
    return { ok: false, error: `Los montos cambiaron (ahora ${formatMoney(total, CURRENCY)}). Revisa y vuelve a intentar.` };
  }

  await db.payment.createMany({
    data: payable.map((e) => ({
      employeeId: e.employeeId,
      periodFrom: isoToDate(from),
      periodTo: isoToDate(to),
      amount: toDecimalString(e.total, CURRENCY.decimals),
    })),
  });
  revalidatePath("/gestion/pagos");
  revalidatePath("/gestion");
  return { ok: true, count: payable.length };
}

/**
 * Los días de un pago cambiaron después de pagar (se reabrió un día): registra
 * que se pagó la diferencia, dejando el pago con el monto actual.
 */
export async function settlePaymentDifference(id: string, expectedCurrent: number): Promise<ActionResult> {
  await verifySession();
  const p = await db.payment.findUnique({ where: { id } });
  if (!p) return { ok: false, error: "Ese pago ya no existe." };

  const from = dateToISO(p.periodFrom);
  const to = dateToISO(p.periodTo);
  const { summary } = await getPayroll({ from, to });
  const current = summary.employees
    .find((e) => e.employeeId === p.employeeId)
    ?.payments.find((x) => x.id === id)?.currentAmount;
  if (current === undefined || current === null || current !== expectedCurrent) {
    return { ok: false, error: "Los montos cambiaron. Recarga la página y revisa." };
  }

  await db.payment.update({ where: { id }, data: { amount: toDecimalString(current, CURRENCY.decimals) } });
  revalidatePath("/gestion/pagos");
  revalidatePath("/gestion");
  return { ok: true };
}

/** Deshace un pago registrado por error. */
export async function deletePayment(id: string): Promise<ActionResult> {
  await verifySession();
  const { count } = await db.payment.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "Ese pago ya no existe." };
  revalidatePath("/gestion/pagos");
  revalidatePath("/gestion");
  return { ok: true };
}
