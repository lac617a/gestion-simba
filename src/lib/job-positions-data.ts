import "server-only";
import { cache } from "react";
import { CURRENCY } from "@/lib/config";
import { db } from "@/lib/db";
import { formatMoney, fromDecimal } from "@/lib/money";

export type JobPosition = {
  id: string;
  name: string;
  /** Pago diario en unidades mínimas (pesos en COP) */
  dailyPay: number;
  /** Empleados (activos o no) que tienen este puesto */
  employees: number;
};

/** Puestos en el orden de Configuración. Una consulta por petición. */
export const getJobPositions = cache(async (): Promise<JobPosition[]> => {
  const rows = await db.jobPosition.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, dailyPay: true, _count: { select: { employees: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    dailyPay: fromDecimal(p.dailyPay, CURRENCY.decimals)!,
    employees: p._count.employees,
  }));
});

/** Opciones para el selector de puesto: "Mesero · $ 60.000 por día". */
export async function getPositionOptions() {
  return (await getJobPositions()).map((p) => ({
    id: p.id,
    label: `${p.name} · ${formatMoney(p.dailyPay, CURRENCY)} por día`,
  }));
}
