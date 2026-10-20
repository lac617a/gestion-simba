import "server-only";
import { cache } from "react";
import {
  CURRENCY,
  DEFAULT_DOUBLE_SHIFT_WEEKDAYS,
  DEFAULT_PAY_DAY,
  DEFAULT_PAY_WEEK_START,
  DEFAULT_CALENDAR_EMAIL,
  DEFAULT_PRODUCTION_PAY,
  DEFAULT_REMINDER_EMAIL,
  DEFAULT_SHIFT_HOURS,
  DEFAULT_WHATSAPP,
} from "@/lib/config";
import { db } from "@/lib/db";
import { fromDecimal } from "@/lib/money";
import { payCalendar } from "@/lib/payday";
import { DEFAULT_OCCASIONS } from "@/lib/reservations";

export type AppSettings = {
  payWeekStart: number;
  payDay: number;
  /** Lunes festivos ("YYYY-MM-DD") en los que se pidió la semana de pago normal (sin alargarla) */
  payHolidaysOff: string[];
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
  /** Pago fijo por jornada de producción (unidades mínimas) */
  productionPay: number;
  /** Correo del recordatorio 1 hora antes de cada reserva; "" = sin recordatorios */
  reminderEmail: string;
  /** Correo al que se mandan las reservas como invitación de calendario; "" = sin calendario */
  calendarEmail: string;
  /** Ocasiones del selector de las reservas, en orden (sin "Ninguna" ni "Otra") */
  occasions: string[];
  /** Correo que recibe cada mañana el respaldo de todos los datos; "" = sin respaldo por correo */
  backupEmail: string;
  /** Cuándo salió el último respaldo por correo */
  lastBackupAt: Date | null;
};

/** Ajustes del restaurante (Configuración). Sin fila guardada, los del .env. Una consulta por petición. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const row = await db.appSettings.findUnique({ where: { id: 1 } });
  return row
    ? {
        payWeekStart: row.payWeekStart,
        payDay: row.payDay,
        payHolidaysOff: row.payHolidaysOff,
        openingHours: row.openingHours,
        whatsapp: row.whatsapp,
        googleRating: row.googleRating,
        googleReviewCount: row.googleReviewCount,
        doubleShiftWeekdays: row.doubleShiftWeekdays,
        shiftHours: row.shiftHours,
        productionPay: fromDecimal(row.productionPay, CURRENCY.decimals)!,
        reminderEmail: row.reminderEmail,
        calendarEmail: row.calendarEmail,
        occasions: row.occasions,
        backupEmail: row.backupEmail,
        lastBackupAt: row.lastBackupAt,
      }
    : {
        payWeekStart: DEFAULT_PAY_WEEK_START,
        payDay: DEFAULT_PAY_DAY,
        payHolidaysOff: [],
        openingHours: [],
        whatsapp: DEFAULT_WHATSAPP,
        googleRating: 4.6,
        googleReviewCount: 243,
        doubleShiftWeekdays: DEFAULT_DOUBLE_SHIFT_WEEKDAYS,
        shiftHours: DEFAULT_SHIFT_HOURS,
        productionPay: DEFAULT_PRODUCTION_PAY * 10 ** CURRENCY.decimals,
        reminderEmail: DEFAULT_REMINDER_EMAIL,
        calendarEmail: DEFAULT_CALENDAR_EMAIL,
        occasions: DEFAULT_OCCASIONS,
        backupEmail: "",
        lastBackupAt: null,
      };
});

/** Semana de pago y día de pago, con los lunes festivos que la alargan (ver payday.ts). */
export async function getPayCalendar() {
  return payCalendar(await getSettings());
}
