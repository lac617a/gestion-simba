import "server-only";
import { today } from "@/lib/config";
import { addDays, daysBetween, isISODate } from "@/lib/dates";
import { isPayWeek, payWeekOf, shiftPayWeek } from "@/lib/payday";
import { fortnightRange, monthRange, shiftPeriod, type Period } from "@/lib/periods";
import { getPayCalendar } from "@/lib/settings";

const MAX_RANGE_DAYS = 366;

/** Periodo pedido por URL (?desde&hasta) o, si no hay, la semana actual. */
export async function periodFromParams(desde: unknown, hasta: unknown): Promise<Period> {
  if (isISODate(desde) && isISODate(hasta)) {
    const [from, to] = desde <= hasta ? [desde, hasta] : [hasta, desde];
    return { from, to: daysBetween(from, to) > MAX_RANGE_DAYS ? addDays(from, MAX_RANGE_DAYS) : to };
  }
  return payWeekOf(today(), await getPayCalendar());
}

/** Atajos del selector de periodo. El primero es el periodo por defecto. */
export async function periodPresets() {
  const t = today();
  return [
    { label: "Semana", period: payWeekOf(t, await getPayCalendar()) },
    { label: "Quincena", period: fortnightRange(t) },
    { label: "Mes", period: monthRange(t) },
  ];
}

/**
 * Periodo anterior (-1) o siguiente (+1) para las flechas del selector. Una
 * semana de pago salta a la semana de pago vecina (con lunes festivo pueden
 * durar 8 o 6 días); lo demás, como siempre.
 */
export async function adjacentPeriod(period: Period, dir: 1 | -1): Promise<Period> {
  const cal = await getPayCalendar();
  return isPayWeek(period, cal) ? shiftPayWeek(period, dir, cal) : shiftPeriod(period, dir);
}
