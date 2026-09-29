import { parseMoney } from "@/lib/money";

/** Puesto con su pago diario en unidades mínimas (pesos en COP). */
export type JobPositionInput = { id: string | null; name: string; dailyPay: number };

type ParseResult = { success: true; data: JobPositionInput[] } | { success: false; error: string };

/** "Jefe de Mesa " y "jefe de mesa" son el mismo puesto. */
const key = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

/**
 * Lista de puestos de Configuración. Llega como columnas paralelas
 * (positionId / positionName / positionPay), en el orden en que se muestran;
 * un puesto nuevo trae el id vacío.
 */
export function parseJobPositionsForm(formData: FormData, decimals: number): ParseResult {
  const ids = formData.getAll("positionId").map(String);
  const names = formData.getAll("positionName").map(String);
  const pays = formData.getAll("positionPay").map(String);

  if (names.length === 0) return { success: false, error: "Debe haber al menos un puesto." };
  if (ids.length !== names.length || pays.length !== names.length) {
    return { success: false, error: "Formulario incompleto. Recarga la página." };
  }

  const seen = new Set<string>();
  const data: JobPositionInput[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim().replace(/\s+/g, " ");
    const label = name || `El puesto ${i + 1}`;
    if (name.length < 2) return { success: false, error: `${label}: escribe el nombre del puesto.` };
    if (name.length > 40) return { success: false, error: `${label}: máximo 40 caracteres.` };
    if (seen.has(key(name))) return { success: false, error: `“${name}” está repetido.` };
    seen.add(key(name));

    const dailyPay = parseMoney(pays[i], decimals);
    if (dailyPay === null || dailyPay <= 0) return { success: false, error: `${name}: escribe el pago diario.` };

    data.push({ id: ids[i] || null, name, dailyPay });
  }
  return { success: true, data };
}
