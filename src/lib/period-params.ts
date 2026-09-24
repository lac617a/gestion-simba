import "server-only";
import { PAY_WEEK_START, today } from "@/lib/config";
import { addDays, daysBetween, isISODate } from "@/lib/dates";
import { fortnightRange, monthRange, weekRange, type Period } from "@/lib/periods";

const MAX_RANGE_DAYS = 366;

/** Periodo pedido por URL (?desde&hasta) o, si no hay, la semana actual. */
export function periodFromParams(desde: unknown, hasta: unknown): Period {
  if (isISODate(desde) && isISODate(hasta)) {
    const [from, to] = desde <= hasta ? [desde, hasta] : [hasta, desde];
    return { from, to: daysBetween(from, to) > MAX_RANGE_DAYS ? addDays(from, MAX_RANGE_DAYS) : to };
  }
  return weekRange(today(), PAY_WEEK_START);
}

/** Atajos del selector de periodo. El primero es el periodo por defecto. */
export function periodPresets() {
  const t = today();
  return [
    { label: "Semana", period: weekRange(t, PAY_WEEK_START) },
    { label: "Quincena", period: fortnightRange(t) },
    { label: "Mes", period: monthRange(t) },
  ];
}
