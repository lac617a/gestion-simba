import { addDays, weekdayOf, type ISODate } from "@/lib/dates";
import { holidayOn } from "@/lib/holidays";

/**
 * Por qué el restaurante abre o cierra un día:
 * - normal: abre como siempre
 * - holiday-open: festivo en día de cierre → abre
 * - closed-weekday: su día de cierre semanal (ej. lunes)
 * - after-holiday: día siguiente a un festivo en que se abrió (ej. martes) → cierra
 * - override-open / override-closed: excepción puesta a mano
 */
export type ScheduleReason =
  | "normal"
  | "holiday-open"
  | "closed-weekday"
  | "after-holiday"
  | "override-open"
  | "override-closed";

export type DaySchedule = {
  date: ISODate;
  open: boolean;
  reason: ScheduleReason;
  /** Nombre del festivo de ese día, si lo es */
  holiday: string | null;
  /** Festivo que provoca el cierre del día siguiente (reason after-holiday) */
  previousHoliday: string | null;
};

/**
 * Regla del restaurante: cierra sus días de cierre semanal (lunes), salvo que
 * sean festivo; en ese caso abre y cierra el día siguiente (martes).
 * Una excepción manual (`override`) manda sobre la regla.
 */
export function daySchedule(date: ISODate, closedWeekdays: number[], override: boolean | null = null): DaySchedule {
  const holiday = holidayOn(date);
  const yesterday = addDays(date, -1);
  const previousHoliday = closedWeekdays.includes(weekdayOf(yesterday)) ? holidayOn(yesterday) : null;
  const base = { date, holiday, previousHoliday };

  if (override !== null) return { ...base, open: override, reason: override ? "override-open" : "override-closed" };
  if (closedWeekdays.includes(weekdayOf(date))) {
    return holiday ? { ...base, open: true, reason: "holiday-open" } : { ...base, open: false, reason: "closed-weekday" };
  }
  if (previousHoliday) return { ...base, open: false, reason: "after-holiday" };
  return { ...base, open: true, reason: "normal" };
}

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Explicación corta para mostrar en pantalla. */
export function scheduleLabel(s: DaySchedule): string {
  switch (s.reason) {
    case "closed-weekday":
      return `El restaurante cierra los ${WEEKDAY_NAMES[weekdayOf(s.date)]}.`;
    case "after-holiday":
      return `Cierra porque ayer fue festivo (${s.previousHoliday}) y se abrió.`;
    case "override-closed":
      return "Cerrado por excepción.";
    case "holiday-open":
      return `Festivo (${s.holiday}): el restaurante abre y cierra mañana.`;
    case "override-open":
      return "Abierto por excepción.";
    case "normal":
      return s.holiday ? `Festivo: ${s.holiday}.` : "";
  }
}
