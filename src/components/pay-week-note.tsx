import { CalendarClockIcon } from "lucide-react";
import { formatDayMonth } from "@/lib/dates";
import { holidayOn } from "@/lib/holidays";
import { isPayWeek, payDateOf, weekHolidays } from "@/lib/payday";
import type { Period } from "@/lib/periods";
import { getPayCalendar } from "@/lib/settings";

/**
 * Aviso cuando un lunes festivo cambió la semana de pago que se está mirando:
 * termina ese lunes y se paga el martes, o empieza el martes. Nada en semanas normales.
 */
export async function PayWeekNote({ week }: { week: Period }) {
  const cal = await getPayCalendar();
  if (!isPayWeek(week, cal)) return null;
  const { startsAfter, endsOn } = weekHolidays(week, cal);
  if (!startsAfter && !endsOn) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
      <CalendarClockIcon className="mt-0.5 size-4 shrink-0" />
      <span>
        {startsAfter && <>Esta semana empieza el martes: el {formatDayMonth(startsAfter)} fue festivo y quedó en la semana anterior. </>}
        {endsOn && (
          <>
            El {formatDayMonth(endsOn)} es festivo ({holidayOn(endsOn)}): la semana termina ese lunes y se paga el{" "}
            {formatDayMonth(payDateOf(week, cal))}.
          </>
        )}
      </span>
    </p>
  );
}
