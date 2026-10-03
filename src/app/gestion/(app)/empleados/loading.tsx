import { ChipsSkeleton, HeaderSkeleton, ListSkeleton, LoadingPage } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Empleados: buscador, puestos y la lista agrupada por puesto. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-40" subtitle action />
      <div className="grid gap-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <ChipsSkeleton count={6} />
      </div>
      {[3, 4].map((rows, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-32" />
          <ListSkeleton rows={rows} />
        </div>
      ))}
    </LoadingPage>
  );
}
