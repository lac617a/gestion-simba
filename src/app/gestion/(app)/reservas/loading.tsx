import { ChipsSkeleton, HeaderSkeleton, ListSkeleton, LoadingPage, StatsSkeleton, TabsSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Reservas: pestañas, resumen, buscador, filtros y reservas por día. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-36" action />
      <TabsSkeleton />
      <StatsSkeleton count={3} />
      <div className="grid gap-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <ChipsSkeleton count={5} />
      </div>
      {[3, 2].map((rows, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-5 w-48" />
          <ListSkeleton rows={rows} />
        </div>
      ))}
    </LoadingPage>
  );
}
