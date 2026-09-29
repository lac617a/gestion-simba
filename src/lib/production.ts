import type { ISODate } from "@/lib/dates";
import { parseMoney } from "@/lib/money";

/** Campo del formulario con el excedente de un asistente. */
export const extraField = (employeeId: string) => `extra_${employeeId}`;

export type ProductionInput = {
  date: ISODate;
  note: string | null;
  /** Quiénes asistieron y su excedente (unidades mínimas; 0 si no hay) */
  attendees: { employeeId: string; extraPay: number }[];
};

export type ProductionParse =
  | { success: true; data: ProductionInput }
  | { success: false; error: string; extraErrors?: Record<string, string> };

/**
 * Formulario de una jornada de producción: fecha, nota, los empleados marcados
 * (`employeeId`, uno por asistente) y el excedente de cada uno (`extra_<id>`).
 */
export function parseProductionForm(formData: FormData, decimals: number): ProductionParse {
  const date = String(formData.get("date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "Elige la fecha de la jornada." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const ids = [...new Set(formData.getAll("employeeId").map(String).filter(Boolean))];
  if (ids.length === 0) return { success: false, error: "Marca quién asistió a la producción." };

  const extraErrors: Record<string, string> = {};
  const attendees = ids.map((employeeId) => {
    const raw = String(formData.get(extraField(employeeId)) ?? "").trim();
    const extraPay = raw === "" ? 0 : parseMoney(raw, decimals);
    if (extraPay === null) extraErrors[employeeId] = "Monto inválido";
    return { employeeId, extraPay: extraPay ?? 0 };
  });
  if (Object.keys(extraErrors).length) return { success: false, error: "Revisa los excedentes.", extraErrors };

  return { success: true, data: { date, note: note || null, attendees } };
}

/** Total de una jornada o de un asistente: pago fijo + excedente. */
export function productionTotal(rows: { basePay: number; extraPay: number }[]) {
  return rows.reduce((s, r) => s + r.basePay + r.extraPay, 0);
}
