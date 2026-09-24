import "server-only";
import { cache } from "react";
import { DEFAULT_CLOSED_WEEKDAYS, DEFAULT_PAY_WEEK_START } from "@/lib/config";
import { db } from "@/lib/db";

export type AppSettings = { payWeekStart: number; closedWeekdays: number[] };

/** Ajustes del restaurante (Configuración). Sin fila guardada, los del .env. Una consulta por petición. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const row = await db.appSettings.findUnique({ where: { id: 1 } });
  return row
    ? { payWeekStart: row.payWeekStart, closedWeekdays: row.closedWeekdays }
    : { payWeekStart: DEFAULT_PAY_WEEK_START, closedWeekdays: DEFAULT_CLOSED_WEEKDAYS };
});
