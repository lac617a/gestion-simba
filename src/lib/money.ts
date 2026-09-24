/**
 * Dinero en "unidades mínimas" enteras (pesos en COP, centavos en USD) para
 * no arrastrar errores de punto flotante. En la BD se guarda como Decimal.
 */
export type Currency = { code: string; decimals: number };

const DECIMALS: Record<string, number> = { COP: 0, CLP: 0, PEN: 2, USD: 2, MXN: 2, EUR: 2 };

/** Tope por monto: cabe en Decimal(14,2) con margen. */
export const MAX_MAJOR = 9_999_999_999;

export function currencyOf(code: string): Currency {
  const upper = code.toUpperCase();
  return { code: upper, decimals: DECIMALS[upper] ?? 2 };
}

/**
 * Convierte lo que escribe el usuario a unidades mínimas.
 * COP: "1.250.000", "$ 1.250.000", "1250000" → 1250000.
 * Con decimales: "1,250.50" o "1.250,50" → 125050.
 * Devuelve null si no es un monto válido (vacío, negativo, letras, demasiados decimales).
 */
export function parseMoney(input: string, decimals: number): number | null {
  const s = input.replace(/[\s$]/g, "");
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  let intPart = s;
  let fracPart = "";
  if (decimals > 0) {
    // El último separador es decimal si lo siguen 1..decimals dígitos.
    const m = s.match(/^(.*)[.,](\d+)$/);
    if (m && m[2].length <= decimals) {
      intPart = m[1];
      fracPart = m[2];
    }
  }

  // Lo demás son separadores de miles: deben ir cada 3 dígitos.
  if (/[.,]/.test(intPart) && !/^\d{1,3}([.,]\d{3})+$/.test(intPart)) return null;
  const digits = intPart.replace(/[.,]/g, "");
  if (digits === "" && fracPart === "") return null;

  const major = Number(digits || "0");
  if (major > MAX_MAJOR) return null;
  return major * 10 ** decimals + Number(fracPart.padEnd(decimals, "0") || "0");
}

export function formatMoney(minor: number, currency: Currency) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(minor / 10 ** currency.decimals);
}

/** Unidades mínimas → texto para un campo Decimal de Prisma ("1250000.00"). */
export function toDecimalString(minor: number, decimals: number) {
  return (minor / 10 ** decimals).toFixed(2);
}

/** Decimal de Prisma (o null) → unidades mínimas. */
export function fromDecimal(value: { toString(): string } | null, decimals: number): number | null {
  return value === null ? null : Math.round(Number(value.toString()) * 10 ** decimals);
}
