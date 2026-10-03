import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Piezas de las pantallas de carga (loading.tsx). Next.js las muestra apenas se
 * toca un enlace, mientras el servidor arma la página, y las reemplaza por el
 * contenido cuando llega. Imitan la forma de cada pantalla para que no salte.
 */

const repeat = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Envoltorio de una pantalla que carga; lo anuncia a los lectores de pantalla. */
export function LoadingPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-busy="true" className={cn("grid gap-5", className)}>
      <span role="status" className="sr-only">
        Cargando…
      </span>
      {children}
    </div>
  );
}

/** Título, con subtítulo y botón a la derecha (ej. "Nueva") opcionales. */
export function HeaderSkeleton({
  title = "w-40",
  subtitle = false,
  action = false,
}: {
  title?: string;
  subtitle?: boolean;
  action?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid flex-1 gap-2">
        <Skeleton className={cn("h-8", title)} />
        {subtitle && <Skeleton className="h-4 w-full max-w-md" />}
      </div>
      {action && <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />}
    </div>
  );
}

/** Pestañas (Próximas / Historial, Jornadas / Historial…). */
export function TabsSkeleton() {
  return <Skeleton className="h-10 w-full rounded-xl sm:w-80" />;
}

/** Selector de periodo: flechas, fechas y atajos. */
export function PeriodSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-5 flex-1 sm:w-44 sm:flex-none" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
    </div>
  );
}

/** Tarjetas de totales. */
export function StatsSkeleton({ count = 3, className = "grid-cols-3" }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      {repeat(count).map((i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

const LINE_WIDTHS = ["w-2/5", "w-1/2", "w-1/3", "w-3/5", "w-1/4"];

/** Lista con borde: cada fila con un título y una línea de detalle. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-lg border">
      {repeat(rows).map((i) => (
        <div key={i} className="grid gap-2 px-4 py-3.5">
          <Skeleton className={cn("h-4", LINE_WIDTHS[i % LINE_WIDTHS.length])} />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

const CHIP_WIDTHS = ["w-20", "w-24", "w-16", "w-28", "w-20", "w-14", "w-24", "w-[4.5rem]"];

/** Chips (personas, filtros) de distintos anchos. */
export function ChipsSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {repeat(count).map((i) => (
        <Skeleton key={i} className={cn("h-7 rounded-full", CHIP_WIDTHS[i % CHIP_WIDTHS.length])} />
      ))}
    </div>
  );
}

/** Formulario: etiquetas, campos y el botón de guardar. */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="grid gap-5">
      {repeat(fields).map((i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-9 w-36 rounded-lg" />
    </div>
  );
}

/** Pantalla de un formulario (nueva / editar). */
export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <LoadingPage className="max-w-xl gap-6">
      <HeaderSkeleton title="w-56" />
      <FormSkeleton fields={fields} />
    </LoadingPage>
  );
}
