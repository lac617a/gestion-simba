import { HeaderSkeleton, LoadingPage, StatsSkeleton, TabsSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Ficha del empleado: pestañas, mes, totales y calendario. */
export default function Loading() {
  return (
    <LoadingPage className="max-w-2xl gap-6">
      <HeaderSkeleton title="w-48" subtitle />
      <TabsSkeleton />
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-5 flex-1 sm:w-44 sm:flex-none" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <StatsSkeleton count={3} />
      <StatsSkeleton count={4} className="grid-cols-2 sm:grid-cols-4" />
      <div className="grid max-w-md grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </LoadingPage>
  );
}
