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
import { addMonths, formatDateRange, formatDayMonth, formatDayShort, formatMonth, monthOf, type ISOMonth } from "@/lib/dates";
import type { CalendarDay } from "@/lib/employee-history";
import { getEmployeeMonth } from "@/lib/employee-history-data";
import { WEEKDAYS_SHORT } from "@/lib/employees";
import { formatMoney } from "@/lib/money";
import { entryTotal } from "@/lib/payroll";
import { dayHref, employeeProfileHref, periodHref } from "@/lib/search-params";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const money = (v: number) => formatMoney(v, CURRENCY);
const paidAtFormat = new Intl.DateTimeFormat("es-CO", { timeZone: APP_TIMEZONE, day: "numeric", month: "short" });

const STATUS_ICON: Record<AttendanceStatus, LucideIcon> = {
  WORKED: CheckIcon,
  ABSENT: XIcon,
  REST: MoonIcon,
  EXTRA_REST: CoffeeIcon,
  LEAVE: PalmtreeIcon,
  PENDING: CircleDashedIcon,
};

const SHIFT_TEXT: Record<WorkShift, string> = { MORNING: "turno de la mañana", EVENING: "turno de la noche", BOTH: "doble turno" };

/** Lo que dice un día, para lectores de pantalla y al pasar el mouse. */
function dayLabel(d: CalendarDay, todayIso: string) {
  const what = d.beforeHire
    ? "todavía no trabajaba aquí"
    : d.closedDay
      ? "restaurante cerrado"
      : d.status === "PENDING"
        ? "sin marcar"
        : d.status
          ? `${STATUS_LABEL[d.status]}${d.planned ? " (previsto)" : ""}`
          : d.date > todayIso
            ? null
            : "sin registro";
  return [formatDayMonth(d.date), what, d.shift && SHIFT_TEXT[d.shift], d.production && "producción"]
    .filter(Boolean)
    .join(" · ");
}

/** Ficha → Historial: el mes en calendario, lo ganado, lo pagado y los pagos. */
export async function EmployeeHistory({
  employee,
  month,
}: {
  employee: { id: string; hireDate: Date | null; restDays: number[] };
  month: ISOMonth;
}) {
  const settings = await getSettings();
  const { period, weeks, counts, pay, unclosedDays } = await getEmployeeMonth(employee, month, settings.payWeekStart);
  const todayIso = today();
  const current = monthOf(todayIso);
  const monthHref = (m: ISOMonth) => employeeProfileHref(`/gestion/empleados/${employee.id}`, { mes: m === current ? null : m });
  const weekdays = Array.from({ length: 7 }, (_, i) => WEEKDAYS_SHORT[(settings.payWeekStart + i) % 7]);
  const workedHint = [
    counts.doubleShifts > 0 && `${counts.doubleShifts} con doble turno`,
    counts.production > 0 && `${counts.production} de producción`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-5">
      {/* ---------- Mes ---------- */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Mes anterior"
          render={<Link href={monthHref(addMonths(month, -1))} />}
          nativeButton={false}
        >
          <PendingIcon>
            <ChevronLeftIcon />
          </PendingIcon>
        </Button>
        <p className="min-w-0 flex-1 text-center font-medium first-letter:uppercase sm:w-44 sm:flex-none">{formatMonth(month)}</p>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Mes siguiente"
          render={<Link href={monthHref(addMonths(month, 1))} />}
          nativeButton={false}
        >
          <PendingIcon>
            <ChevronRightIcon />
          </PendingIcon>
        </Button>
        {month !== current && (
          <Button variant="ghost" size="lg" render={<Link href={monthHref(current)} />} nativeButton={false}>
            <PendingText>Este mes</PendingText>
          </Button>
        )}
      </div>

      {/* ---------- Totales ---------- */}
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Ganado" value={money(pay?.total ?? 0)} hint="pago + propinas + producción" strong />
        <Stat label="Pagado" value={money(pay?.paid ?? 0)} />
        <Stat label="Por pagar" value={money(pay?.pending ?? 0)} />
      </dl>
      {pay && (
        <p className="-mt-2 text-sm text-muted-foreground tabular-nums">
          Pago del día {money(pay.pay)} · Propinas {money(pay.tips)}
          {pay.productionDays > 0 && ` · Producción ${money(pay.production)}`}
        </p>
      )}
      <UnclosedWarning days={unclosedDays} what="lo de esos días se suma cuando se cierren." />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Trabajó" value={`${counts.worked} ${counts.worked === 1 ? "día" : "días"}`} hint={workedHint || undefined} />
        <Stat label="Faltas" value={String(counts.absent)} />
        <Stat
          label="Descansos"
          value={String(counts.rest + counts.extraRest)}
          hint={counts.extraRest > 0 ? `${counts.extraRest} ${counts.extraRest === 1 ? "permiso" : "permisos"}` : undefined}
        />
        <Stat label="Vacaciones / incap." value={String(counts.leave)} />
      </dl>
      {counts.unmarked > 0 && (
        <p className="-mt-2 text-sm text-amber-800">
          {counts.unmarked === 1 ? "1 día quedó sin marcar" : `${counts.unmarked} días quedaron sin marcar`} en la asistencia.
        </p>
      )}

      {/* ---------- Calendario ---------- */}
      <section className="grid gap-3" aria-label={`Asistencia de ${formatMonth(month)}`}>
        <div className="grid max-w-md grid-cols-7 gap-1 text-center">
          {weekdays.map((w) => (
            <div key={w} className="pb-1 text-xs text-muted-foreground">
              {w}
            </div>
          ))}
          {weeks.flat().map((d, i) => (d ? <DayCell key={d.date} day={d} todayIso={todayIso} /> : <div key={`hueco-${i}`} />))}
        </div>
        <Legend />
      </section>

      {/* ---------- Día por día ---------- */}
      {pay && pay.entries.length > 0 && (
        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
            Lo ganado día por día
          </summary>
          <div className="overflow-x-auto px-4 pb-3">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1.5 text-left font-normal">Fecha</th>
                  <th className="py-1.5 text-right font-normal">Pago</th>
                  <th className="py-1.5 text-right font-normal">Propina</th>
                  <th className="py-1.5 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pay.entries.map((x) => (
                  <tr key={`${x.kind ?? "work"}-${x.date}`}>
                    <td className="py-1.5 whitespace-nowrap">
                      {formatDayShort(x.date)}
                      {x.kind === "production" && " · Producción"}
                    </td>
                    <td className="py-1.5 text-right">{money(x.kind === "production" ? (x.production ?? 0) : x.dailyPay)}</td>
                    <td className="py-1.5 text-right">{x.kind === "production" ? "—" : money(x.tip)}</td>
                    <td className="py-1.5 text-right font-medium">{money(entryTotal(x))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ---------- Pagos ---------- */}
      <section className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">Pagos</h2>
          <Link
            href={periodHref("/gestion/pagos", { desde: period.from, hasta: period.to })}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver en Pagos
          </Link>
        </div>
        {pay && pay.payments.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {pay.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{formatDateRange(p.from, p.to)}</div>
                  <div className="text-muted-foreground">
                    Pagado el {paidAtFormat.format(new Date(p.paidAt))}
                    {p.note && ` · ${p.note}`}
                  </div>
                </div>
                <span className="font-semibold tabular-nums">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Ningún pago registrado para los días de este mes.</p>
        )}
      </section>
    </div>
  );
}

function DayCell({ day: d, todayIso }: { day: CalendarDay; todayIso: string }) {
  const Icon = d.closedDay ? DoorClosedIcon : d.status ? STATUS_ICON[d.status] : null;
  const label = dayLabel(d, todayIso);
  const className = cn(
    "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs tabular-nums",
    d.status && STATUS_CHIP_CLASS[d.status],
    d.planned && "border-dashed bg-transparent",
    d.closedDay && "border-dashed bg-muted/50 text-muted-foreground",
    !d.status && !d.closedDay && "text-muted-foreground",
    d.beforeHire && "border-transparent opacity-50",
    d.today && "ring-2 ring-primary ring-offset-1 ring-offset-background"
  );
  const content = (
    <>
      <span className={cn("font-medium", d.today && "font-bold")}>{Number(d.date.slice(8))}</span>
      {Icon ? <Icon aria-hidden className="size-3.5" /> : <span className="size-3.5" />}
      {d.production && <ChefHatIcon aria-hidden className="absolute top-0.5 right-0.5 size-3 text-orange-600" />}
      {d.shift === "BOTH" && <span className="absolute right-1 bottom-0.5 text-[10px] font-semibold">×2</span>}
    </>
  );
  if (d.beforeHire) {
    return (
      <div className={className} title={label} aria-label={label}>
        {content}
      </div>
    );
  }
  // Sin precarga: abrir la asistencia de un día lo crea en la BD.
  return (
    <Link
      href={dayHref("/gestion/asistencia", { fecha: d.date })}
      prefetch={false}
      title={label}
      aria-label={label}
      className={cn(className, "transition-colors hover:border-foreground/40")}
    >
      {content}
    </Link>
  );
}

const LEGEND: { icon: LucideIcon; label: string; className: string }[] = [
  { icon: CheckIcon, label: "Trabajó", className: STATUS_CHIP_CLASS.WORKED },
  { icon: XIcon, label: "Falta", className: STATUS_CHIP_CLASS.ABSENT },
  { icon: MoonIcon, label: "Descanso", className: STATUS_CHIP_CLASS.REST },
  { icon: CoffeeIcon, label: "Permiso", className: STATUS_CHIP_CLASS.EXTRA_REST },
  { icon: PalmtreeIcon, label: "Vacaciones", className: STATUS_CHIP_CLASS.LEAVE },
  { icon: CircleDashedIcon, label: "Sin marcar", className: STATUS_CHIP_CLASS.PENDING },
  { icon: DoorClosedIcon, label: "Cerrado", className: "border-dashed bg-muted/50 text-muted-foreground" },
];

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground" aria-label="Qué significa cada día">
      {LEGEND.map(({ icon: Icon, label, className }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("grid size-5 place-items-center rounded border", className)}>
            <Icon aria-hidden className="size-3" />
          </span>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <ChefHatIcon aria-hidden className="size-3.5 text-orange-600" /> Producción
      </li>
      <li className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-foreground">×2</span> Doble turno
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-5 rounded border border-dashed" /> Previsto (descanso o día libre que viene)
      </li>
    </ul>
  );
}
