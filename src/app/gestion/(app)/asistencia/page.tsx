import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClockIcon } from "lucide-react";
import { closeDay, closeMorningShift, reopenDay, reopenMorningShift } from "@/app/actions/closing";
import { APP_TIMEZONE, CURRENCY, today } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { formatLongDate } from "@/lib/dates";
import { formatHours, hoursFor, parseHours } from "@/lib/hours";
import { loadDay } from "@/lib/search-params";
import { getSettings } from "@/lib/settings";
import { getDayView } from "@/lib/workdays";
import { AttendanceList } from "./attendance-list";
import { ClosedSummary } from "./closed-summary";
import { DateNav } from "./date-nav";
import { ScheduleBar } from "./schedule-bar";
import { ShiftBar } from "./shift-bar";

export const metadata: Metadata = { title: "Asistencia · Gestión Simba" };

const closedAtFormat = new Intl.DateTimeFormat("es-CO", {
  timeZone: APP_TIMEZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AttendancePage({ searchParams }: PageProps<"/gestion/asistencia">) {
  await verifyAdmin();
  const { fecha } = await loadDay(searchParams);
  const todayIso = today();
  const date = fecha ?? todayIso;
  const [view, settings] = await Promise.all([getDayView(date), getSettings()]);
  const hours = hoursFor(view.schedule, settings.openingHours);
  const shifts = settings.shiftHours.map(parseHours);
  const shiftLabels = shifts[0] && shifts[1] ? ([formatHours(shifts[0]), formatHours(shifts[1])] as [string, string]) : null;
  const morningClosed = view.morningClosedAt !== null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold">Asistencia</h1>
        <DateNav date={date} today={todayIso} />
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatLongDate(date)}
          {date === todayIso && " · hoy"}
        </p>
      </div>

      <ScheduleBar date={date} mode={view.mode} schedule={view.schedule} hours={hours && formatHours(hours)} />

      {view.mode !== "dayoff" && (
        <ShiftBar
          date={date}
          doubleShift={view.doubleShift}
          shiftLabels={shiftLabels}
          canToggle={view.mode === "open" && !morningClosed}
        />
      )}

      {view.mode === "future" && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          <CalendarClockIcon className="mt-0.5 size-4 shrink-0" />
          <p>Vista previa. Muestra descansos fijos y días libres asignados; la asistencia se marca ese mismo día.</p>
        </div>
      )}

      {view.mode === "closed" && view.closing && (
        <ClosedSummary
          closing={view.closing}
          rows={view.rows}
          doubleShift={view.doubleShift}
          currency={CURRENCY}
          closedAtLabel={view.closing.closedAt ? `cerrado ${closedAtFormat.format(new Date(view.closing.closedAt))}` : null}
          reopenAction={reopenDay.bind(null, date)}
        />
      )}

      {view.mode === "dayoff" ? null : view.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No hay empleados activos para esta fecha.{" "}
          <Link href="/gestion/empleados/nuevo" className="text-foreground underline underline-offset-4">
            Registrar empleado
          </Link>
        </div>
      ) : (
        <AttendanceList
          key={`${date}-${view.mode}-${view.doubleShift}-${morningClosed}`}
          date={date}
          rows={view.rows}
          editable={view.mode === "open"}
          doubleShift={view.doubleShift}
          morningClosed={morningClosed}
          closing={
            view.mode === "open"
              ? {
                  action: closeDay.bind(null, date),
                  morningAction: closeMorningShift.bind(null, date),
                  reopenMorning: reopenMorningShift.bind(null, date),
                  currency: CURRENCY,
                  saved: view.closing,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
