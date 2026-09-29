import "server-only";
import { cache } from "react";
import {
  DEFAULT_DOUBLE_SHIFT_WEEKDAYS,
  DEFAULT_PAY_DAY,
  DEFAULT_PAY_WEEK_START,
  DEFAULT_SHIFT_HOURS,
  DEFAULT_WHATSAPP,
} from "@/lib/config";
import { db } from "@/lib/db";

export type AppSettings = {
  payWeekStart: number;
  payDay: number;
  /** 7 textos "HH:MM-HH:MM" (0 = domingo … 6 = sábado); "" = sin horario. Un 8.º valor viejo (festivos) se ignora. */
  openingHours: string[];
  /** WhatsApp del restaurante (página pública) */
  whatsapp: string;
  /** Calificación y total de opiniones en Google (página pública, se escriben a mano) */
  googleRating: number;
  googleReviewCount: number;
  /** Días con doble turno (0 = domingo … 6 = sábado) */
  doubleShiftWeekdays: number[];
  /** ["HH:MM-HH:MM" de la mañana, "HH:MM-HH:MM" de la tarde] */
  shiftHours: string[];
};

/** Ajustes del restaurante (Configuración). Sin fila guardada, los del .env. Una consulta por petición. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const row = await db.appSettings.findUnique({ where: { id: 1 } });
  return row
    ? {
        payWeekStart: row.payWeekStart,
        payDay: row.payDay,
        openingHours: row.openingHours,
        whatsapp: row.whatsapp,
        googleRating: row.googleRating,
        googleReviewCount: row.googleReviewCount,
        doubleShiftWeekdays: row.doubleShiftWeekdays,
        shiftHours: row.shiftHours,
      }
    : {
        payWeekStart: DEFAULT_PAY_WEEK_START,
        payDay: DEFAULT_PAY_DAY,
        openingHours: [],
        whatsapp: DEFAULT_WHATSAPP,
        googleRating: 4.6,
        googleReviewCount: 243,
        doubleShiftWeekdays: DEFAULT_DOUBLE_SHIFT_WEEKDAYS,
        shiftHours: DEFAULT_SHIFT_HOURS,
      };
});
