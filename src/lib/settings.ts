import "server-only";
import { cache } from "react";
import { DEFAULT_CLOSED_WEEKDAYS, DEFAULT_PAY_DAY, DEFAULT_PAY_WEEK_START } from "@/lib/config";
import { db } from "@/lib/db";

export type AppSettings = {
  payWeekStart: number;
  payDay: number;
  closedWeekdays: number[];
  /** 8 textos "HH:MM-HH:MM" (0–6 = domingo…sábado, 7 = festivos); "" = sin horario */
  openingHours: string[];
};

/** Ajustes del restaurante (Configuración). Sin fila guardada, los del .env. Una consulta por petición. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const row = await db.appSettings.findUnique({ where: { id: 1 } });
  return row
    ? {
        payWeekStart: row.payWeekStart,
        payDay: row.payDay,
        closedWeekdays: row.closedWeekdays,
        openingHours: row.openingHours,
      }
    : {
        payWeekStart: DEFAULT_PAY_WEEK_START,
        payDay: DEFAULT_PAY_DAY,
        closedWeekdays: DEFAULT_CLOSED_WEEKDAYS,
        openingHours: [],
      };
});
