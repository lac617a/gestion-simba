import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { formatRestDays } from "@/lib/employees";
import { cn } from "@/lib/utils";
import { FlashToast } from "@/components/flash-toast";

export const metadata: Metadata = { title: "Empleados · Gestión Simba" };

const FILTERS = {
  activos: { label: "Activos", where: { active: true } },
  inactivos: { label: "Inactivos", where: { active: false } },
  todos: { label: "Todos", where: {} },
} satisfies Record<string, { label: string; where: Prisma.EmployeeWhereInput }>;

type Filter = keyof typeof FILTERS;

export default async function EmployeesPage({ searchParams }: PageProps<"/gestion/empleados">) {
  await verifySession();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filter: Filter =
    typeof params.estado === "string" && params.estado in FILTERS ? (params.estado as Filter) : "activos";

  const employees = await db.employee.findMany({
    where: {
      ...FILTERS[filter].where,
      ...(q && { name: { contains: q, mode: "insensitive" } }),
    },
    orderBy: { name: "asc" },
  });

  const flash = params.creado ? "Empleado registrado" : params.actualizado ? "Cambios guardados" : null;

  return (
    <div className="grid gap-5">
      {flash && <FlashToast message={flash} />}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Empleados</h1>
        <Button render={<Link href="/gestion/empleados/nuevo" />} nativeButton={false} size="lg">
          <PlusIcon />
          Nuevo
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative flex-1" role="search">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="hidden" name="estado" value={filter} />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre" className="pl-8" aria-label="Buscar por nombre" />
        </form>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="group" aria-label="Filtrar por estado">
          {(Object.keys(FILTERS) as Filter[]).map((key) => (
            <Link
              key={key}
              href={{ pathname: "/gestion/empleados", query: { estado: key, ...(q && { q }) } }}
              aria-current={filter === key ? "page" : undefined}
              className={cn(
                "flex-1 rounded-md px-3 py-1 text-center text-muted-foreground",
                filter === key && "bg-background text-foreground shadow-sm"
              )}
            >
              {FILTERS[key].label}
            </Link>
          ))}
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {q ? `No hay empleados que coincidan con “${q}”.` : "Todavía no hay empleados aquí."}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {employees.map((e) => (
            <li key={e.id}>
              <Link
                href={`/gestion/empleados/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{e.name}</span>
                    {!e.active && <Badge variant="secondary">Baja</Badge>}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {[e.position, e.phone].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>Descanso</div>
                  <div className="text-foreground">{formatRestDays(e.restDays)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        {employees.length} {employees.length === 1 ? "empleado" : "empleados"}
      </p>
    </div>
  );
}
