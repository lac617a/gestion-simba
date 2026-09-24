import "server-only";
import { todayISO } from "@/lib/dates";
import { currencyOf } from "@/lib/money";

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Bogota";
export const DAY_CUTOFF_HOUR = Number(process.env.DAY_CUTOFF_HOUR ?? 0) || 0;
export const CURRENCY = currencyOf(process.env.APP_CURRENCY || "COP");
/**
 * Días de la semana en que el restaurante cierra (0 = domingo … 6 = sábado).
 * Por defecto lunes. Si ese día es festivo, abre y cierra el día siguiente.
 * CLOSED_WEEKDAYS="" = nunca cierra por regla.
 */
export const CLOSED_WEEKDAYS = (process.env.CLOSED_WEEKDAYS ?? "1")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => /^[0-6]$/.test(s))
  .map(Number);

/** Día en que empieza la semana de pago: 0 = domingo … 6 = sábado. Por defecto lunes. */
export const PAY_WEEK_START = (() => {
  const n = Number(process.env.PAY_WEEK_START ?? 1);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 1;
})();

/** Día de trabajo actual del restaurante ("YYYY-MM-DD"). */
export function today() {
  return todayISO(APP_TIMEZONE, DAY_CUTOFF_HOUR);
}
