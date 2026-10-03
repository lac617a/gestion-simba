import { HeaderSkeleton, ListSkeleton, LoadingPage } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Empleados: buscador, filtro y la lista. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-40" action />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 rounded-lg sm:flex-1" />
        <Skeleton className="h-9 rounded-lg sm:w-60" />
      </div>
      <ListSkeleton rows={8} />
    </LoadingPage>
  );
}
