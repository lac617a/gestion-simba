import type { ISODate } from "@/lib/dates";
import { holidayOn } from "@/lib/holidays";

/**
 * Si el restaurante abre un día. Simba abre de lunes a domingo, festivos
 * incluidos; solo cierra un día puntual marcado a mano en Asistencia
 * ("Marcar como día cerrado", ej. 25 de diciembre).
 * - normal: abre
 * - override-closed: cerrado por excepción
 */
export type ScheduleReason = "normal" | "override-closed";

export type DaySchedule = {
  date: ISODate;
  open: boolean;
  reason: ScheduleReason;
  /** Nombre del festivo de ese día, si lo es (informativo y para el horario de festivos) */
  holiday: string | null;
};

/**
 * `override` es la excepción guardada para ese día (tabla DayOverride). Solo
 * cuenta cerrar: las excepciones "abrir" quedaron de cuando había días de cierre
 * y ya no cambian nada.
 */
export function daySchedule(date: ISODate, override: boolean | null = null): DaySchedule {
  const holiday = holidayOn(date);
  return override === false
    ? { date, holiday, open: false, reason: "override-closed" }
    : { date, holiday, open: true, reason: "normal" };
}

/** Explicación corta para mostrar en pantalla. */
export function scheduleLabel(s: DaySchedule): string {
  if (s.reason === "override-closed") return "Cerrado por excepción.";
  return s.holiday ? `Festivo: ${s.holiday}.` : "";
}
