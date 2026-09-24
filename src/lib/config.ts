import "server-only";
import { todayISO } from "@/lib/dates";
import { currencyOf } from "@/lib/money";

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Bogota";
export const DAY_CUTOFF_HOUR = Number(process.env.DAY_CUTOFF_HOUR ?? 0) || 0;
export const CURRENCY = currencyOf(process.env.APP_CURRENCY || "COP");

/** Día de trabajo actual del restaurante ("YYYY-MM-DD"). */
export function today() {
  return todayISO(APP_TIMEZONE, DAY_CUTOFF_HOUR);
}
