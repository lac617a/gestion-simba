import { HeaderSkeleton, ListSkeleton, LoadingPage, PeriodSkeleton, StatsSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Reportes: periodo, totales de venta, gráfico y tablas. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-36" />
      <PeriodSkeleton />
      <div className="grid gap-3">
        <Skeleton className="h-6 w-40" />
        <StatsSkeleton count={6} className="grid-cols-2 sm:grid-cols-3" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <ListSkeleton rows={4} />
    </LoadingPage>
  );
}
