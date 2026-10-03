import { ChipsSkeleton, HeaderSkeleton, ListSkeleton, LoadingPage, StatsSkeleton, TabsSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Ficha del empleado: pestañas, semana de pago, totales y los 7 días. */
export default function Loading() {
  return (
    <LoadingPage className="max-w-2xl gap-6">
      <HeaderSkeleton title="w-48" subtitle />
      <TabsSkeleton />
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-5 flex-1 sm:w-56 sm:flex-none" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="mx-auto h-4 w-48 sm:mx-0" />
      </div>
      <StatsSkeleton count={3} />
      <div className="grid gap-2">
        <ChipsSkeleton count={3} />
        <ListSkeleton rows={7} />
      </div>
    </LoadingPage>
  );
}
