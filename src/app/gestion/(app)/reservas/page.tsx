import type { Metadata } from "next";
import Link from "next/link";
import { ClockIcon, DoorClosedIcon, PlusIcon, SearchIcon } from "lucide-react";
import { FlashToast } from "@/components/flash-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { addDays, formatLongDate } from "@/lib/dates";
import { formatHours } from "@/lib/hours";
import { getPastReservations, getUpcomingReservations, type ReservationDay } from "@/lib/reservations-data";
import { scheduleLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { ReservationList } from "./reservation-list";

export const metadata: Metadata = { title: "Reservas · Gestión Simba" };

const VIEWS = { proximas: "Próximas", anteriores: "Anteriores" } as const;
type View = keyof typeof VIEWS;

export default async function ReservationsPage({ searchParams }: PageProps<"/gestion/reservas">) {
  await verifySession();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const view: View = params.ver === "anteriores" ? "anteriores" : "proximas";
  const t = today();
  const days = view === "proximas" ? await getUpcomingReservations(t, q) : await getPastReservations(t, q);

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative flex-1" role="search">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="hidden" name="ver" value={view} />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre" className="pl-8" aria-label="Buscar por nombre" />
        </form>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="group" aria-label="Qué reservas ver">
          {(Object.keys(VIEWS) as View[]).map((key) => (
            <Link
              key={key}
              href={{ pathname: "/gestion/reservas", query: { ver: key, ...(q && { q }) } }}
              aria-current={view === key ? "page" : undefined}
              className={cn(
                "flex-1 rounded-md px-3 py-1 text-center text-muted-foreground",
                view === key && "bg-background text-foreground shadow-sm"
              )}
            >
              {VIEWS[key]}
            </Link>
          ))}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {q
            ? `No hay reservas que coincidan con “${q}”.`
            : view === "proximas"
              ? "No hay reservas próximas."
              : "No hay reservas anteriores."}
        </div>
      ) : (
        days.map((day) => <DaySection key={day.date} day={day} today={t} />)
      )}
    </div>
  );
}

function DaySection({ day, today }: { day: ReservationDay; today: string }) {
  const relative = day.date === today ? "Hoy · " : day.date === addDays(today, 1) ? "Mañana · " : "";
  return (
    <section id={`dia-${day.date}`} className="grid scroll-mt-20 gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-semibold first-letter:uppercase">
          {relative}
          {formatLongDate(day.date)}
        </h2>
        <span className="text-sm text-muted-foreground">
          {day.totals.count} {day.totals.count === 1 ? "reserva" : "reservas"} · {day.totals.people}{" "}
          {day.totals.people === 1 ? "persona" : "personas"}
        </span>
      </div>
      {!day.schedule.open ? (
        <p className="flex items-center gap-1.5 text-sm text-amber-800">
          <DoorClosedIcon className="size-4 shrink-0" /> Restaurante cerrado. {scheduleLabel(day.schedule)}
        </p>
      ) : (
        day.hours && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" /> Abre de {formatHours(day.hours)}
          </p>
        )
      )}
      <ReservationList reservations={day.reservations} today={today} />
    </section>
  );
}
