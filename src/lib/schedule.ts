import type { ISODate } from "@/lib/dates";

/**
 * Si el restaurante abre un día. Simba abre de lunes a domingo; solo cierra un
 * día puntual marcado a mano en Asistencia ("Marcar como día cerrado").
 * - normal: abre
 * - override-closed: cerrado por excepción
 */
export type ScheduleReason = "normal" | "override-closed";

export type DaySchedule = {
  date: ISODate;
  open: boolean;
  reason: ScheduleReason;
};

/**
 * `override` es la excepción guardada para ese día (tabla DayOverride). Solo
 * cuenta cerrar: las excepciones "abrir" quedaron de cuando había días de cierre
 * y ya no cambian nada.
 */
export function daySchedule(date: ISODate, override: boolean | null = null): DaySchedule {
  return override === false ? { date, open: false, reason: "override-closed" } : { date, open: true, reason: "normal" };
}

/** Explicación corta para mostrar en pantalla. */
export function scheduleLabel(s: DaySchedule): string {
  return s.reason === "override-closed" ? "Cerrado por excepción." : "";
}
