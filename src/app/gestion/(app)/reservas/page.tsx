import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClockIcon, ClockIcon, DoorClosedIcon, HistoryIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { FlashToast } from "@/components/flash-toast";
import { PeriodNav } from "@/components/period-nav";
import { Stat } from "@/components/report-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today } from "@/lib/config";
import { verifyReservations } from "@/lib/dal";
import { addDays, formatLongDate, isISODate } from "@/lib/dates";
import { formatHours } from "@/lib/hours";
import { periodFromParams, periodPresets } from "@/lib/period-params";
import { monthRange, type Period } from "@/lib/periods";
import { dayTotals } from "@/lib/reservations";
import { getReservationHistory, getUpcomingReservations, type ReservationDay } from "@/lib/reservations-data";
import { scheduleLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { ReservationList } from "./reservation-list";

export const metadata: Metadata = { title: "Reservas · Gestión Simba" };

type View = "proximas" | "historial";

/** Filtros de estado (?estado=). En el historial, "Confirmadas" de días pasados = sin marcar. */
const FILTERS = [
  { key: "todas", status: null },
  { key: "confirmadas", status: "CONFIRMED" },
  { key: "llego", status: "ARRIVED" },
  { key: "no-vino", status: "NO_SHOW" },
  { key: "canceladas", status: "CANCELLED" },
] as const satisfies readonly { key: string; status: ReservationStatus | null }[];
type FilterKey = (typeof FILTERS)[number]["key"];

const filterLabel = (key: FilterKey, view: View) =>
  ({ todas: "Todas", confirmadas: view === "historial" ? "Sin marcar" : "Confirmadas", llego: "Llegó", "no-vino": "No vino", canceladas: "Canceladas" })[
    key
  ];

function parseFilter(value: unknown): FilterKey {
  if (value === "sin-marcar") return "confirmadas";
  return FILTERS.some((f) => f.key === value) ? (value as FilterKey) : "todas";
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function ReservationsPage({ searchParams }: PageProps<"/gestion/reservas">) {
  await verifyReservations();
  const params = await searchParams;
  const q = str(params.q).trim();
  // "anteriores" era la pestaña de antes del historial (enlaces viejos).
  const view: View = params.ver === "historial" || params.ver === "anteriores" ? "historial" : "proximas";
  const filter = parseFilter(params.estado);
  const t = today();

  let days: ReservationDay[];
  let period: Period | null = null;
  let summary: Awaited<ReturnType<typeof getReservationHistory>>["summary"] | null = null;
  if (view === "proximas") {
    days = await getUpcomingReservations(t, q);
  } else {
    period = isISODate(params.desde) && isISODate(params.hasta) ? await periodFromParams(params.desde, params.hasta) : monthRange(t);
    ({ days, summary } = await getReservationHistory(period, t, q));
  }

  const all = days.flatMap((d) => d.reservations);
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, f.status ? all.filter((r) => r.status === f.status).length : all.length])
  ) as Record<FilterKey, number>;
  const status = FILTERS.find((f) => f.key === filter)!.status;
  const shown = status
    ? days
        .map((d) => ({ ...d, reservations: d.reservations.filter((r) => r.status === status) }))
        .filter((d) => d.reservations.length > 0)
    : days;

  // Enlaces que conservan pestaña, búsqueda, estado y periodo.
  const base = { ver: view, ...(q && { q }), ...(filter !== "todas" && { estado: filter }), ...(period && { desde: period.from, hasta: period.to }) };
  const href = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(Object.entries({ ...base, ...changes }).filter(([, v]) => v) as [string, string][]);
    return `/gestion/reservas?${p}`;
  };

  const flash = params.creado
    ? "Reserva guardada"
    : params.actualizado
      ? "Cambios guardados"
      : params.eliminado
        ? "Reserva eliminada"
        : null;

  return (
    <div className="grid gap-5">
      {flash && <FlashToast message={flash} />}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <Button render={<Link href="/gestion/reservas/nueva" />} nativeButton={false} size="lg">
          <PlusIcon />
          Nueva
        </Button>
      </div>

      {/* ---------- Pestañas ---------- */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm sm:w-80" role="group" aria-label="Qué reservas ver">
        {(
          [
            ["proximas", "Próximas", CalendarClockIcon],
            ["historial", "Historial", HistoryIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <Link
            key={key}
            href={`/gestion/reservas?${new URLSearchParams({ ver: key, ...(q && { q }) })}`}
            aria-current={view === key ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-muted-foreground",
              view === key && "bg-background text-foreground shadow-sm"
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </div>

      {view === "historial" && period && (
        <div className="grid gap-1">
          <PeriodNav
            basePath="/gestion/reservas"
            period={period}
            presets={await periodPresets()}
            keep={Object.fromEntries(Object.entries(base).filter(([k]) => k !== "desde" && k !== "hasta"))}
          />
          {period.to > t && <p className="text-xs text-muted-foreground">El historial llega hasta hoy.</p>}
        </div>
      )}

      {/* ---------- Buscar y filtrar ---------- */}
      <div className="grid gap-3">
        <form className="relative" role="search" action="/gestion/reservas">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          {Object.entries(base)
            .filter(([k]) => k !== "q")
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre…"
            aria-label="Buscar por nombre (quien reserva o la persona de la ocasión)"
            className="h-10 pr-10 pl-9 text-base"
          />
          {q && (
            <Link
              href={href({ q: null })}
              aria-label="Quitar búsqueda"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Link>
          )}
        </form>
        <nav
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filtrar por estado"
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Link
                key={f.key}
                href={href({ estado: f.key === "todas" ? null : f.key })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground",
                  active && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
                  !active && counts[f.key] === 0 && "opacity-60"
                )}
              >
                {filterLabel(f.key, view)}
                <span className={cn("tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{counts[f.key]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {view === "proximas" && !q && filter === "todas" && <UpcomingSummary days={days} today={t} />}

      {view === "historial" && period && summary && (
        <>
          {all.length > 0 && (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Reservas"
                value={String(summary.totals.count)}
                hint={`${summary.totals.people} ${summary.totals.people === 1 ? "persona" : "personas"}`}
                strong
              />
              <Stat
                label="Llegaron"
                value={String(summary.status.arrived)}
                hint={summary.status.showRate === null ? undefined : `${summary.status.showRate} % de las marcadas`}
              />
              <Stat label="No vinieron" value={String(summary.status.noShow)} />
              <Stat label="Canceladas" value={String(summary.status.cancelled)} />
            </dl>
          )}
          {summary.status.unmarked > 0 && filter !== "confirmadas" && (
            <p className="text-sm text-amber-800">
              {summary.status.unmarked === 1
                ? "1 reserva de días pasados sigue sin marcar"
                : `${summary.status.unmarked} reservas de días pasados siguen sin marcar`}{" "}
              (Llegó / No vino).{" "}
              <Link href={href({ estado: "confirmadas" })} className="font-medium underline underline-offset-4">
                Verlas
              </Link>
            </p>
          )}
        </>
      )}

      {/* ---------- Lista ---------- */}
      {(q || filter !== "todas") && shown.length > 0 && (
        <p className="-mb-2 text-sm text-muted-foreground">
          {counts[filter]} {counts[filter] === 1 ? "reserva" : "reservas"}
          {q && ` con “${q}”`}
        </p>
      )}
      {shown.length === 0 ? (
        <EmptyState view={view} q={q} filtered={filter !== "todas"} clearHref={href({ q: null, estado: null })} />
      ) : (
        <div className="grid gap-6">
          {shown.map((day) => (
            <DaySection key={day.date} day={day} today={t} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Próximas: hoy, mañana y los próximos 7 días de un vistazo (sin canceladas). */
function UpcomingSummary({ days, today }: { days: ReservationDay[]; today: string }) {
  const totalsUntil = (last: string) =>
    dayTotals(days.filter((d) => d.date <= last).flatMap((d) => d.reservations));
  const on = (date: string) => days.find((d) => d.date === date)?.totals ?? { count: 0, people: 0 };
  const label = (t: { count: number; people: number }) =>
    `${t.count} ${t.count === 1 ? "reserva" : "reservas"}`;
  const people = (t: { count: number; people: number }) => `${t.people} ${t.people === 1 ? "persona" : "personas"}`;
  const items = [
    { name: "Hoy", t: on(today), strong: true },
    { name: "Mañana", t: on(addDays(today, 1)), strong: false },
    { name: "7 días", t: totalsUntil(addDays(today, 6)), strong: false },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map((i) => (
        <Stat key={i.name} label={i.name} value={label(i.t)} hint={people(i.t)} strong={i.strong} />
      ))}
    </dl>
  );
}

function EmptyState({ view, q, filtered, clearHref }: { view: View; q: string; filtered: boolean; clearHref: string }) {
  const message =
    q || filtered
      ? `No hay reservas${q ? ` con “${q}”` : ""}${filtered ? " en ese estado" : ""}${view === "historial" ? " en estas fechas" : ""}.`
      : view === "proximas"
        ? "No hay reservas próximas."
        : "No hay reservas en estas fechas.";
  return (
    <div className="grid justify-items-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
      <p>{message}</p>
      {q || filtered ? (
        <Button variant="outline" render={<Link href={clearHref} />} nativeButton={false}>
          Quitar filtros
        </Button>
      ) : (
        view === "proximas" && (
          <Button variant="outline" render={<Link href="/gestion/reservas/nueva" />} nativeButton={false}>
            <PlusIcon /> Anotar una reserva
          </Button>
        )
      )}
    </div>
  );
}

function DaySection({ day, today }: { day: ReservationDay; today: string }) {
  const relative = day.date === today ? "Hoy" : day.date === addDays(today, 1) ? "Mañana" : day.date === addDays(today, -1) ? "Ayer" : null;
  return (
    <section id={`dia-${day.date}`} className="grid scroll-mt-20 gap-2">
      {/* El encabezado del día queda fijo bajo la barra superior al bajar por la lista */}
      <div className="sticky top-14 z-[5] -mx-1 flex flex-wrap items-baseline justify-between gap-x-3 bg-background/95 px-1 py-1.5 backdrop-blur">
        <h2 className="font-semibold first-letter:uppercase">
          {relative && (
            <span className="mr-2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">{relative}</span>
          )}
          {formatLongDate(day.date)}
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {day.totals.count} {day.totals.count === 1 ? "reserva" : "reservas"} · {day.totals.people}{" "}
          {day.totals.people === 1 ? "persona" : "personas"}
        </span>
      </div>
      {!day.schedule.open ? (
        <p className="flex items-center gap-1.5 text-sm text-amber-800">
          <DoorClosedIcon className="size-4 shrink-0" /> Restaurante cerrado. {scheduleLabel(day.schedule)}
        </p>
      ) : (
        day.date >= today &&
        day.hours && (
          <p className="-mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" /> Abre de {formatHours(day.hours)}
          </p>
        )
      )}
      <ReservationList reservations={day.reservations} today={today} />
    </section>
  );
}
