import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarHeartIcon,
  CircleCheckIcon,
  ClockIcon,
  DoorClosedIcon,
  LockIcon,
  PlusIcon,
  WalletIcon,
} from "lucide-react";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { Stat } from "@/components/report-bits";
import { Button } from "@/components/ui/button";
import { STATUS_ACTIVE_CLASS, STATUS_LABEL } from "@/lib/attendance";
import { CURRENCY, today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { addDays, formatDateRange, formatDayShort, formatLongDate, weekdayOf } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/employees";
import { nextHoliday } from "@/lib/holidays";
import { formatHours, hoursFor } from "@/lib/hours";
import { formatMoney } from "@/lib/money";
import { payDue, type PayDue } from "@/lib/payday";
import { getPayroll } from "@/lib/payroll-data";
import { weekRange } from "@/lib/periods";
import { getReports } from "@/lib/reports-data";
import { getReservationsOn } from "@/lib/reservations-data";
import { scheduleLabel } from "@/lib/schedule";
import { getSchedule } from "@/lib/schedule-data";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { getDayView, type DayRow } from "@/lib/workdays";
import { ReservationList } from "./reservas/reservation-list";

export const metadata: Metadata = { title: "Hoy · Gestión Simba" };

/** Pantalla de inicio (PRD RF-6): cómo va el día y la semana. */
export default async function TodayPage() {
  await verifySession();
  const date = today();
  const settings = await getSettings();
  const week = weekRange(date, settings.payWeekStart);
  const due = payDue(date, settings.payWeekStart, settings.payDay);
  const holiday = nextHoliday(addDays(date, 1));
  const [view, payroll, duePayroll, reports, holidaySchedule, reservations] = await Promise.all([
    getDayView(date),
    getPayroll(week),
    getPayroll(due.week),
    getReports(week),
    getSchedule(holiday.date),
    getReservationsOn(date),
  ]);
  const hours = hoursFor(view.schedule, settings.openingHours);
  const money = (v: number | null) => formatMoney(v ?? 0, CURRENCY);

  const by = (...statuses: AttendanceStatus[]) => view.rows.filter((r) => statuses.includes(r.status));
  const pending = by("PENDING");
  const working = by("WORKED");
  const resting = by("REST", "EXTRA_REST", "LEAVE");
  const absent = by("ABSENT");
  const closed = view.mode === "closed";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Hoy</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatLongDate(date)}
          {view.schedule.holiday && ` · Festivo: ${view.schedule.holiday}`}
        </p>
        {hours && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockIcon className="size-3.5" /> Abre de {formatHours(hours)}
          </p>
        )}
      </div>

      {duePayroll.summary.totals.pending > 0 && (
        <PayDueCard
          due={due}
          pending={money(duePayroll.summary.totals.pending)}
          employees={duePayroll.summary.employees.filter((e) => e.pending > 0).length}
          unclosedDays={duePayroll.unclosedDays}
        />
      )}

      {/* Estado del día */}
      <section
        className={cn(
          "grid gap-3 rounded-lg border p-4",
          !closed && pending.length > 0 && "border-amber-300 bg-amber-50/60"
        )}
      >
        {view.mode === "dayoff" ? (
          <>
            <p className="flex items-center gap-2 font-medium">
              <DoorClosedIcon className="size-4" /> Hoy el restaurante está cerrado
            </p>
            <p className="text-sm text-muted-foreground">{scheduleLabel(view.schedule)}</p>
            <GoTo href="/gestion/asistencia">Abrir hoy igual</GoTo>
          </>
        ) : view.rows.length === 0 ? (
          <>
            <p className="font-medium">Todavía no hay empleados registrados.</p>
            <Button className="justify-self-start" render={<Link href="/gestion/empleados/nuevo" />} nativeButton={false}>
              Registrar empleado
            </Button>
          </>
        ) : closed ? (
          <>
            <div className="flex items-center gap-2 font-medium">
              <LockIcon className="size-4" /> Día cerrado
            </div>
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Venta" value={money(view.closing?.totalSales ?? 0)} />
              <Stat label="Propinas" value={money(view.closing?.tipsTotal ?? 0)} />
            </dl>
            <GoTo href="/gestion/asistencia">Ver el cierre</GoTo>
          </>
        ) : pending.length > 0 ? (
          <>
            <p className="font-medium">
              Falta marcar la asistencia de {pending.length} {pending.length === 1 ? "empleado" : "empleados"}.
            </p>
            <Button className="justify-self-start" render={<Link href="/gestion/asistencia" />} nativeButton={false}>
              Marcar asistencia <ArrowRightIcon />
            </Button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-medium">
              <CircleCheckIcon className="size-4 text-emerald-600" /> Asistencia completa. Falta cerrar el día.
            </p>
            <Button className="justify-self-start" render={<Link href="/gestion/asistencia#cierre" />} nativeButton={false}>
              Cerrar el día <ArrowRightIcon />
            </Button>
          </>
        )}
      </section>

      {/* Reservas de hoy */}
      <section className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDaysIcon className="size-4" /> Reservas de hoy
          </h2>
          {reservations && (
            <span className="text-sm text-muted-foreground">
              {reservations.totals.count} {reservations.totals.count === 1 ? "reserva" : "reservas"} ·{" "}
              {reservations.totals.people} {reservations.totals.people === 1 ? "persona" : "personas"}
            </span>
          )}
        </div>
        {reservations ? (
          <ReservationList reservations={reservations.reservations} today={date} />
        ) : (
          <p className="text-sm text-muted-foreground">No hay reservas para hoy.</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <GoTo href="/gestion/reservas">Ver todas</GoTo>
          <Link href="/gestion/reservas/nueva" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            <PlusIcon className="size-3.5" /> Nueva reserva
          </Link>
        </div>
      </section>

      {/* Quién está hoy */}
      {view.rows.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          <PeopleGroup title="Trabajan" rows={working} empty="Nadie marcado como “Trabajó” todavía." />
          <PeopleGroup title="Pendientes" rows={pending} empty="Ninguno." />
          <PeopleGroup title="Descansan" rows={resting} empty="Nadie descansa hoy." showStatus />
          {absent.length > 0 && <PeopleGroup title="Faltaron" rows={absent} />}
        </section>
      )}

      {/* Próximo festivo */}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <CalendarHeartIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          Próximo festivo: <span className="font-medium text-foreground first-letter:uppercase">{formatDayShort(holiday.date)}</span> ·{" "}
          {holiday.name}
          {holidaySchedule.reason === "holiday-open" &&
            ` — el restaurante abre y cierra el ${formatDayShort(addDays(holiday.date, 1))}`}
        </span>
      </p>

      {/* La semana */}
      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Esta semana</h2>
          <span className="text-sm text-muted-foreground">{formatDateRange(week.from, week.to)}</span>
        </div>
        <dl className="grid grid-cols-2 gap-2">
          <Stat
            label="Venta acumulada"
            value={money(reports.sales.totalSales)}
            hint={`${reports.sales.days.length} ${reports.sales.days.length === 1 ? "día cerrado" : "días cerrados"}`}
          />
          <Stat
            label="Por pagar (pagos + propinas)"
            value={money(payroll.summary.totals.pending)}
            hint={payroll.summary.totals.paid > 0 ? `Ya pagado: ${money(payroll.summary.totals.paid)}` : undefined}
            strong
          />
        </dl>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <GoTo href="/gestion/reportes">Ver reportes</GoTo>
          <GoTo href="/gestion/pagos">Ver pagos</GoTo>
        </div>
      </section>
    </div>
  );
}

/** Recordatorio del día de pago: la semana que terminó y lo que falta pagarle. */
function PayDueCard({
  due,
  pending,
  employees,
  unclosedDays,
}: {
  due: PayDue;
  pending: string;
  employees: number;
  unclosedDays: number;
}) {
  const title =
    due.status === "today"
      ? "Hoy es día de pago"
      : due.status === "late"
        ? `Pago pendiente desde el ${formatDayShort(due.payDate)}`
        : `El ${WEEKDAYS[weekdayOf(due.payDate)].toLowerCase()} toca pagar`;

  return (
    <section
      className={cn(
        "grid gap-3 rounded-lg border p-4",
        due.status === "today" && "border-primary/40 bg-primary/5",
        due.status === "late" && "border-amber-300 bg-amber-50/60"
      )}
    >
      <div>
        <p className="flex items-center gap-2 font-medium">
          <WalletIcon className="size-4" /> {title}
        </p>
        <p className="text-sm text-muted-foreground">Semana {formatDateRange(due.week.from, due.week.to)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Por pagar (pagos + propinas)" value={pending} strong />
        <Stat label="Empleados" value={String(employees)} />
      </dl>
      {unclosedDays > 0 && (
        <p className="text-sm text-amber-800">
          {unclosedDays === 1 ? "Hay 1 día sin cerrar" : `Hay ${unclosedDays} días sin cerrar`} en esa semana: el total
          puede cambiar al cerrarlo.
        </p>
      )}
      <Button
        className="justify-self-start"
        render={<Link href={`/gestion/pagos?desde=${due.week.from}&hasta=${due.week.to}`} />}
        nativeButton={false}
      >
        Ir a pagar <ArrowRightIcon />
      </Button>
    </section>
  );
}

function PeopleGroup({
  title,
  rows,
  empty,
  showStatus,
}: {
  title: string;
  rows: DayRow[];
  empty?: string;
  showStatus?: boolean;
}) {
  return (
    <div className="grid content-start gap-2 rounded-lg border p-3">
      <h3 className="flex items-center justify-between text-sm font-medium">
        {title}
        <span className="rounded-full bg-muted px-2 text-xs tabular-nums">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {rows.map((r) => (
            <li key={r.employeeId} className="flex items-center justify-between gap-2">
              <span className="truncate">{r.name}</span>
              {showStatus && (
                <span className={cn("shrink-0 rounded-md border px-1.5 text-xs", STATUS_ACTIVE_CLASS[r.status])}>
                  {STATUS_LABEL[r.status]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GoTo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
      {children} <ArrowRightIcon className="size-3.5" />
    </Link>
  );
}
