import Link from "next/link";
import {
  ChefHatIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  CoffeeIcon,
  DoorClosedIcon,
  MoonIcon,
  PalmtreeIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { PendingIcon, PendingText } from "@/components/link-pending";
import { Stat, UnclosedWarning } from "@/components/report-bits";
import { Button } from "@/components/ui/button";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/attendance";
import { APP_TIMEZONE, CURRENCY, today } from "@/lib/config";
import { dateToISO, formatDateRange, formatDayMonth, formatDayMonthShort, weekdayOf, type ISODate } from "@/lib/dates";
import { recentWeeks, type DayMoney, type EmployeeDay, type WeekSummary } from "@/lib/employee-history";
import { getEmployeeWeek, getEmployeeWeeks } from "@/lib/employee-history-data";
import { WEEKDAYS_SHORT } from "@/lib/employees";
import { formatMoney } from "@/lib/money";
import { payDateOf } from "@/lib/payday";
import { shiftPeriod, weekRange, type Period } from "@/lib/periods";
import { dayHref, employeeProfileHref, periodHref } from "@/lib/search-params";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const money = (v: number) => formatMoney(v, CURRENCY);
const paidAtFormat = new Intl.DateTimeFormat("es-CO", { timeZone: APP_TIMEZONE, day: "numeric", month: "short" });

/** Cuántas semanas se resumen abajo: la que se mira y las anteriores. */
const RECENT_WEEKS = 8;

const STATUS_ICON: Record<AttendanceStatus, LucideIcon> = {
  WORKED: CheckIcon,
  ABSENT: XIcon,
  REST: MoonIcon,
  EXTRA_REST: CoffeeIcon,
  LEAVE: PalmtreeIcon,
  PENDING: CircleDashedIcon,
};

const SHIFT_TEXT: Record<WorkShift, string> = { MORNING: "mañana", EVENING: "noche", BOTH: "doble turno" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Ficha → Historial, por semana de pago (la misma de Pagos, ej. lunes a domingo):
 * lo ganado, pagado y por pagar; cada día con lo marcado y lo ganado; y las
 * últimas semanas con su estado de pago.
 */
export async function EmployeeHistory({
  employee,
  date,
}: {
  employee: { id: string; hireDate: Date | null; restDays: number[] };
  /** Un día de la semana que se mira; null = la semana actual */
  date: ISODate | null;
}) {
  const settings = await getSettings();
  const todayIso = today();
  const current = weekRange(todayIso, settings.payWeekStart);
  const week = date ? weekRange(date, settings.payWeekStart) : current;
  const hireDate = employee.hireDate && dateToISO(employee.hireDate);
  const [data, recent] = await Promise.all([
    getEmployeeWeek(employee, week),
    getEmployeeWeeks(employee, recentWeeks(week, RECENT_WEEKS, hireDate)),
  ]);
  const weekHref = (w: Period) =>
    employeeProfileHref(`/gestion/empleados/${employee.id}`, { semana: w.from === current.from ? null : w.from });
  const { counts, pay } = data;
  // Conteos de la semana (los que son 0 no se muestran, salvo trabajó y faltas)
  const tally: { label: string; value: string; tone?: "danger" | "warning" }[] = [
    {
      label: "Trabajó",
      value:
        plural(counts.worked, "día", "días") +
        (counts.doubleShifts > 0 ? ` (${plural(counts.doubleShifts, "doble", "dobles")})` : ""),
    },
    { label: "Faltas", value: String(counts.absent), tone: counts.absent > 0 ? "danger" : undefined },
    ...(counts.rest > 0 ? [{ label: "Descansos", value: String(counts.rest) }] : []),
    ...(counts.extraRest > 0 ? [{ label: "Permisos", value: String(counts.extraRest) }] : []),
    ...(counts.leave > 0 ? [{ label: "Vacaciones", value: String(counts.leave) }] : []),
    ...(counts.production > 0 ? [{ label: "Producción", value: String(counts.production) }] : []),
    ...(counts.unmarked > 0 ? [{ label: "Sin marcar", value: String(counts.unmarked), tone: "warning" as const }] : []),
  ];

  return (
    <div className="grid gap-5">
      {/* ---------- Semana ---------- */}
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Semana anterior"
            render={<Link href={weekHref(shiftPeriod(week, -1))} />}
            nativeButton={false}
          >
            <PendingIcon>
              <ChevronLeftIcon />
            </PendingIcon>
          </Button>
          <p className="min-w-0 flex-1 text-center font-medium sm:flex-none sm:px-2">{formatDateRange(week.from, week.to)}</p>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Semana siguiente"
            render={<Link href={weekHref(shiftPeriod(week, 1))} />}
            nativeButton={false}
          >
            <PendingIcon>
              <ChevronRightIcon />
            </PendingIcon>
          </Button>
          {week.from !== current.from && (
            <Button variant="ghost" size="lg" render={<Link href={weekHref(current)} />} nativeButton={false}>
              <PendingText>Esta semana</PendingText>
            </Button>
          )}
        </div>
        <PayStatus
          status={!pay || pay.total === 0 ? "none" : pay.status}
          payDate={payDateOf(week, settings.payDay)}
          todayIso={todayIso}
          lastPaidAt={data.payments.map((p) => p.paidAt).sort().at(-1) ?? null}
        />
      </div>

      {/* ---------- Totales de la semana ---------- */}
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Ganado" value={money(pay?.total ?? 0)} strong />
        <Stat label="Pagado" value={money(pay?.paid ?? 0)} />
        <Stat label="Por pagar" value={money(pay?.pending ?? 0)} />
      </dl>
      {pay && (
        <p className="-mt-2 text-sm text-muted-foreground tabular-nums">
          Pago del día {money(pay.pay)} · Propinas {money(pay.tips)}
          {pay.productionDays > 0 && ` · Producción ${money(pay.production)}`}
        </p>
      )}
      <UnclosedWarning days={data.unclosedDays} what="lo de esos días se suma cuando se cierren." />

      {/* ---------- Día por día ---------- */}
      <section className="grid gap-2" aria-label={`Días del ${formatDateRange(week.from, week.to)}`}>
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {tally.map((t) => (
            <li
              key={t.label}
              className={cn(
                "rounded-full bg-muted px-2.5 py-1",
                t.tone === "danger" && "bg-red-50 text-red-800",
                t.tone === "warning" && "bg-amber-50 text-amber-900"
              )}
            >
              <span className={cn(!t.tone && "text-muted-foreground")}>{t.label}</span>{" "}
              <span className="font-medium tabular-nums">{t.value}</span>
            </li>
          ))}
        </ul>
        <ul className="divide-y rounded-lg border">
          {data.days.map((d) => (
            <DayRow key={d.date} day={d} earned={data.money.get(d.date) ?? null} todayIso={todayIso} />
          ))}
        </ul>
      </section>

      {/* ---------- Pagos de la semana ---------- */}
      <section className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">Pagos</h2>
          <Link
            href={periodHref("/gestion/pagos", { desde: week.from, hasta: week.to })}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver en Pagos
          </Link>
        </div>
        {data.payments.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">Pagado el {paidAtFormat.format(new Date(p.paidAt))}</div>
                  <div className="text-muted-foreground">
                    {formatDateRange(p.from, p.to)}
                    {p.note && ` · ${p.note}`}
                  </div>
                </div>
                <span className="font-semibold tabular-nums">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Esta semana todavía no tiene pagos registrados.</p>
        )}
      </section>

      {/* ---------- Últimas semanas ---------- */}
      {recent.length > 1 && (
        <section className="grid gap-2">
          <h2 className="font-medium">Últimas semanas</h2>
          <ul className="divide-y rounded-lg border">
            {recent.map((s) => (
              <li key={s.week.from}>
                <Link
                  href={weekHref(s.week)}
                  aria-current={s.week.from === week.from ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50",
                    s.week.from === week.from && "bg-muted/60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{formatDateRange(s.week.from, s.week.to)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {plural(s.worked, "día", "días")}
                      {s.absent > 0 && <span className="text-red-700"> · {plural(s.absent, "falta", "faltas")}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums">{money(s.total)}</div>
                    <WeekPay summary={s} payDate={payDateOf(s.week, settings.payDay)} todayIso={todayIso} />
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Debajo de la semana: si ya se pagó, cuándo se paga o desde cuándo se debe. */
function PayStatus({
  status,
  payDate,
  todayIso,
  lastPaidAt,
}: {
  status: WeekSummary["status"];
  payDate: ISODate;
  todayIso: ISODate;
  lastPaidAt: string | null;
}) {
  if (status === "none") {
    return payDate > todayIso ? (
      <p className="text-center text-sm text-muted-foreground sm:text-left">Se paga el {formatDayMonth(payDate)}</p>
    ) : null;
  }
  if (status === "paid") {
    return (
      <p className="text-center text-sm text-emerald-700 sm:text-left">
        Pagada{lastPaidAt && ` el ${paidAtFormat.format(new Date(lastPaidAt))}`}
      </p>
    );
  }
  if (payDate > todayIso) {
    return <p className="text-center text-sm text-muted-foreground sm:text-left">Se paga el {formatDayMonth(payDate)}</p>;
  }
  return (
    <p className="text-center text-sm text-amber-800 sm:text-left">
      {status === "partial" ? "Falta pagar una parte" : "Por pagar"} desde el {formatDayMonth(payDate)}
    </p>
  );
}

/** Estado de pago corto para la lista de semanas. */
function WeekPay({ summary: s, payDate, todayIso }: { summary: WeekSummary; payDate: ISODate; todayIso: ISODate }) {
  if (s.status === "none") return null;
  if (s.status === "paid") return <div className="text-xs text-emerald-700">Pagada</div>;
  if (payDate > todayIso) return <div className="text-xs text-muted-foreground">Se paga el {formatDayMonthShort(payDate)}</div>;
  return <div className="text-xs text-amber-800 tabular-nums">Falta {money(s.pending)}</div>;
}

/** Lo que dice el chip de un día. */
function dayStatus(d: EmployeeDay, todayIso: ISODate): { text: string; className: string; icon: LucideIcon | null } | null {
  if (d.beforeHire) return { text: "Aún no ingresaba", className: "border-transparent text-muted-foreground", icon: null };
  if (d.closedDay) return { text: "Restaurante cerrado", className: "border-dashed bg-muted/50 text-muted-foreground", icon: DoorClosedIcon };
  if (d.status) {
    const label = d.status === "PENDING" ? "Sin marcar" : STATUS_LABEL[d.status];
    const shift = d.status === "WORKED" && d.shift ? ` · ${SHIFT_TEXT[d.shift]}` : "";
    return {
      text: `${label}${shift}${d.planned ? " (previsto)" : ""}`,
      className: cn(STATUS_CHIP_CLASS[d.status], d.planned && "border-dashed bg-transparent"),
      icon: STATUS_ICON[d.status],
    };
  }
  return d.date > todayIso ? null : { text: "Sin registro", className: "border-dashed text-muted-foreground", icon: null };
}

/** Un día de la semana: qué pasó y lo ganado. Abre la asistencia de ese día. */
function DayRow({ day: d, earned, todayIso }: { day: EmployeeDay; earned: DayMoney | null; todayIso: ISODate }) {
  const status = dayStatus(d, todayIso);
  const detail = earned
    ? [
        earned.pay > 0 && `Pago ${money(earned.pay)}`,
        earned.tip > 0 && `Propina ${money(earned.tip)}`,
        earned.production > 0 && `Producción ${money(earned.production)}`,
      ].filter(Boolean)
    : [];
  const unclosed = d.status === "WORKED" && !d.dayClosed;
  const content = (
    <>
      <div className="w-16 shrink-0">
        <div className={cn("text-sm font-medium", d.today && "text-primary")}>{WEEKDAYS_SHORT[weekdayOf(d.date)]}</div>
        <div className="text-xs whitespace-nowrap text-muted-foreground">{formatDayMonthShort(d.date)}</div>
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {status && (
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", status.className)}>
              {status.icon && <status.icon aria-hidden className="size-3" />}
              {status.text}
            </span>
          )}
          {d.production && (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-900">
              <ChefHatIcon aria-hidden className="size-3" />
              Producción
            </span>
          )}
          {d.today && <span className="text-xs font-medium text-primary">Hoy</span>}
        </div>
        {detail.length > 0 && <p className="text-xs text-muted-foreground tabular-nums">{detail.join(" · ")}</p>}
        {unclosed && <p className="text-xs text-amber-800">Sin cerrar: el pago y la propina se suman al cerrar el día.</p>}
      </div>
      <div className="shrink-0 text-right text-sm font-medium tabular-nums">{earned && earned.total > 0 && money(earned.total)}</div>
    </>
  );
  const className = cn("flex items-start gap-3 px-4 py-3", d.today && "bg-muted/40");

  if (d.beforeHire) {
    return <li className={cn(className, "opacity-60")}>{content}</li>;
  }
  return (
    <li>
      {/* Sin precarga: abrir la asistencia de un día lo crea en la BD. */}
      <Link
        href={dayHref("/gestion/asistencia", { fecha: d.date })}
        prefetch={false}
        className={cn(className, "transition-colors hover:bg-muted/50")}
      >
        {content}
      </Link>
    </li>
  );
}
