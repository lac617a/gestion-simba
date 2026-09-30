"use server";

import { revalidatePath } from "next/cache";
import { CURRENCY } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { parseJobPositionsForm } from "@/lib/job-positions";
import { toDecimalString } from "@/lib/money";

export type JobPositionsState = { error?: string; success?: string } | undefined;

/**
 * Guarda la lista completa de puestos: agrega los nuevos, actualiza nombre,
 * pago y orden, y borra los que se quitaron (solo si ningún empleado los tiene).
 * Cambiar un pago no toca los días ya cerrados: ahí quedó guardado lo que se pagó.
 */
export async function saveJobPositions(_prev: JobPositionsState, formData: FormData): Promise<JobPositionsState> {
  await verifyAdmin();
  const parsed = parseJobPositionsForm(formData, CURRENCY.decimals);
  if (!parsed.success) return { error: parsed.error };
  const positions = parsed.data;

  const existing = await db.jobPosition.findMany({
    select: { id: true, name: true, _count: { select: { employees: true } } },
  });
  const kept = new Set(positions.map((p) => p.id).filter(Boolean));
  const removed = existing.filter((p) => !kept.has(p.id));
  const inUse = removed.find((p) => p._count.employees > 0);
  if (inUse) {
    const n = inUse._count.employees;
    return {
      error: `No se puede quitar “${inUse.name}”: lo ${n === 1 ? "tiene 1 empleado" : `tienen ${n} empleados`}. Cámbiales el puesto primero.`,
    };
  }
  if (positions.some((p) => p.id && !existing.some((e) => e.id === p.id))) {
    return { error: "Un puesto ya no existe. Recarga la página." };
  }

  const pay = (minor: number) => toDecimalString(minor, CURRENCY.decimals);
  try {
    await db.$transaction([
      db.jobPosition.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } }),
      // Nombres temporales primero: así se puede intercambiar el nombre de dos puestos sin chocar.
      ...positions
        .filter((p) => p.id)
        .map((p) => db.jobPosition.update({ where: { id: p.id! }, data: { name: `__${p.id}` } })),
      ...positions.map((p, i) =>
        p.id
          ? db.jobPosition.update({ where: { id: p.id }, data: { name: p.name, dailyPay: pay(p.dailyPay), sortOrder: i + 1 } })
          : db.jobPosition.create({ data: { name: p.name, dailyPay: pay(p.dailyPay), sortOrder: i + 1 } })
      ),
    ]);
  } catch {
    return { error: "No se pudieron guardar los puestos. Intenta de nuevo." };
  }

  revalidatePath("/gestion", "layout"); // Configuración, Empleados y el pago sugerido en Asistencia
  return { success: "Puestos guardados." };
}
