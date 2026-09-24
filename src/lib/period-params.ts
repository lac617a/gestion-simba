import "server-only";
import { today } from "@/lib/config";
import { addDays, daysBetween, isISODate } from "@/lib/dates";
import { fortnightRange, monthRange, weekRange, type Period } from "@/lib/periods";
import { getSettings } from "@/lib/settings";

const MAX_RANGE_DAYS = 366;

/** Periodo pedido por URL (?desde&hasta) o, si no hay, la semana actual. */
export async function periodFromParams(desde: unknown, hasta: unknown): Promise<Period> {
  if (isISODate(desde) && isISODate(hasta)) {
    const [from, to] = desde <= hasta ? [desde, hasta] : [hasta, desde];
    return { from, to: daysBetween(from, to) > MAX_RANGE_DAYS ? addDays(from, MAX_RANGE_DAYS) : to };
  }
  return weekRange(today(), (await getSettings()).payWeekStart);
}

/** Atajos del selector de periodo. El primero es el periodo por defecto. */
export async function periodPresets() {
  const t = today();
  const { payWeekStart } = await getSettings();
  return [
    { label: "Semana", period: weekRange(t, payWeekStart) },
    { label: "Quincena", period: fortnightRange(t) },
    { label: "Mes", period: monthRange(t) },
  ];
}
