import { today } from "@/lib/config";
import { addDays, formatDateRange, formatDayMonth, formatDayMonthShort } from "@/lib/dates";
import { mondayHolidays } from "@/lib/holidays";
import { payCalendar, payDateOf, payWeekOf } from "@/lib/payday";
import type { AppSettings } from "@/lib/settings";
import { HolidayWeekSwitch } from "./holiday-week-switch";

/** Desde cuándo y hasta cuándo se listan los lunes festivos. */
const DAYS_BACK = 21;
const DAYS_AHEAD = 365;

/**
 * Lunes festivos de Colombia (los calcula la app) con un interruptor cada uno:
 * encendido, la semana de pago termina ese lunes y se paga el martes.
 */
export function HolidayWeeks({ settings }: { settings: AppSettings }) {
  const t = today();
  const cal = payCalendar(settings);
  const holidays = mondayHolidays(addDays(t, -DAYS_BACK), addDays(t, DAYS_AHEAD));

  return (
    <ul className="divide-y rounded-lg border">
      {holidays.map((h) => {
        const extend = cal.extended.has(h.date);
        // La semana que se paga alrededor de ese lunes: la que lo incluye (alargada) o la que terminó el día antes.
        const week = payWeekOf(extend ? h.date : addDays(h.date, -1), cal);
        return (
          <li key={h.date} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium first-letter:uppercase">{formatDayMonth(h.date)}</div>
              <div className="text-sm text-muted-foreground">{h.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {extend ? "Semana " : "Semana normal "}
                {formatDateRange(week.from, week.to)} · se paga el {formatDayMonthShort(payDateOf(week, cal))}
              </div>
            </div>
            <HolidayWeekSwitch date={h.date} label={formatDayMonthShort(h.date)} extend={extend} />
          </li>
        );
      })}
    </ul>
  );
}
