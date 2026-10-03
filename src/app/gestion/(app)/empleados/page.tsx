import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { FlashToast } from "@/components/flash-toast";
import { PendingText } from "@/components/link-pending";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { searchKey, STATUS_CHIP_CLASS } from "@/lib/attendance";
import { verifyAdmin } from "@/lib/dal";
import { formatDayMonthShort, formatMonthName, monthOf } from "@/lib/dates";
import { groupByPosition, NO_POSITION, positionSlug, todayLabel } from "@/lib/employee-list";
import { getEmployeeList, type EmployeeListRow } from "@/lib/employee-list-data";
import { formatRestDays } from "@/lib/employees";
import { employeesHref, loadEmployees } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Empleados · Gestión Simba" };

/** Empleados agrupados por puesto, con cómo está hoy cada uno y su mes; los dados de baja, plegados al final. */
export default async function EmployeesPage({ searchParams }: PageProps<"/gestion/empleados">) {
  await verifyAdmin();
  const [params, list] = await Promise.all([loadEmployees(searchParams), getEmployeeList()]);
  const q = params.q.trim();
  const key = searchKey(q);
  const matches = list.rows.filter((r) => !key || searchKey(r.name).includes(key));
  const allActive = list.rows.filter((r) => r.active);
  const active = matches.filter((r) => r.active);

  // Un chip por puesto de los activos; el número es lo que coincide con la búsqueda.
  const chips = groupByPosition(allActive).map(([name]) => ({
    name,
    slug: positionSlug(name),
    count: active.filter((r) => (r.position ?? NO_POSITION) === name).length,
  }));
  const puesto = chips.some((c) => c.slug === params.puesto) ? params.puesto : null;
  const inPosition = (r: EmployeeListRow) => !puesto || positionSlug(r.position ?? NO_POSITION) === puesto;
  const groups = groupByPosition(active.filter(inPosition));
  const inactive = matches.filter((r) => !r.active && inPosition(r));
  const href = (p: string | null) => employeesHref("/gestion/empleados", { q, puesto: p });
  const monthName = formatMonthName(monthOf(list.today));

  return (
    <div className="grid gap-5">
      <FlashToast messages={{ creado: "Empleado registrado", actualizado: "Cambios guardados" }} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            {allActive.length} {allActive.length === 1 ? "activo" : "activos"}
            {list.closedToday && " · hoy el restaurante no abre"}
          </p>
        </div>
        <Button render={<Link href="/gestion/empleados/nuevo" />} nativeButton={false} size="lg">
          <PlusIcon />
          Nuevo
        </Button>
      </div>

      <div className="grid gap-3">
        <SearchInput placeholder="Buscar por nombre…" label="Buscar por nombre" />
        {chips.length > 1 && (
          <nav
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Filtrar por puesto"
          >
            <FilterChip href={href(null)} active={!puesto} label="Todos" count={active.length} />
            {chips.map((c) => (
              <FilterChip key={c.slug} href={href(c.slug)} active={puesto === c.slug} label={c.name} count={c.count} />
            ))}
          </nav>
        )}
      </div>

      {list.rows.length === 0 ? (
        <Empty>
          Todavía no hay empleados.{" "}
          <Link href="/gestion/empleados/nuevo" className="text-foreground underline underline-offset-4">
            Registrar el primero
          </Link>
        </Empty>
      ) : groups.length === 0 ? (
        <Empty>
          {key ? `Ningún empleado activo coincide con “${q}”.` : "No hay empleados activos en este puesto."}
        </Empty>
      ) : (
        <div className="grid gap-5">
          {groups.map(([position, people]) => {
            const working = people.filter((p) => p.today?.kind === "status" && p.today.status === "WORKED").length;
            return (
              <section key={position} className="grid gap-2">
                <h2 className="flex items-baseline justify-between gap-2 text-sm font-medium">
                  <span>
                    {position} <span className="font-normal text-muted-foreground">· {people.length}</span>
                  </span>
                  {!list.closedToday && (
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {working} {working === 1 ? "trabaja" : "trabajan"} hoy
                    </span>
                  )}
                </h2>
                <ul className="divide-y rounded-lg border">
                  {people.map((r) => (
                    <EmployeeRow key={r.id} row={r} monthName={monthName} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {inactive.length > 0 && (
        <details className="group rounded-lg border" open={Boolean(key)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            Dados de baja ({inactive.length})
            <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y border-t">
            {inactive.map((r) => (
              <li key={r.id}>
                <Link href={`/gestion/empleados/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.position ?? NO_POSITION}</div>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">{children}</div>;
}

function FilterChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground",
        active && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
        !active && count === 0 && "opacity-60"
      )}
    >
      <PendingText>{label}</PendingText>
      <span className={cn("tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{count}</span>
    </Link>
  );
}

/** Un empleado activo: cómo está hoy, su descanso fijo y lo que lleva del mes. */
function EmployeeRow({ row: r, monthName }: { row: EmployeeListRow; monthName: string }) {
  const label = r.today && todayLabel(r.today, formatDayMonthShort);
  return (
    <li>
      <Link href={`/gestion/empleados/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="truncate font-medium">{r.name}</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {label && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5",
                  r.today?.kind === "status" ? STATUS_CHIP_CLASS[r.today.status] : "border-dashed text-muted-foreground"
                )}
              >
                {label}
              </span>
            )}
            <span className="text-muted-foreground">
              {r.restDays.length ? `Descansa ${formatRestDays(r.restDays).toLowerCase()}` : "Sin descanso fijo"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums first-letter:uppercase">
            {monthName}: {r.month.worked} {r.month.worked === 1 ? "día" : "días"}
            {r.month.absent > 0 && (
              <span className="text-red-700">
                {" "}
                · {r.month.absent} {r.month.absent === 1 ? "falta" : "faltas"}
              </span>
            )}
          </p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
