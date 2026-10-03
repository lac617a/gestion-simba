import { ChipsSkeleton, LoadingPage } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Asistencia: fecha, conteos, buscador y chips por puesto. */
export default function Loading() {
  return (
    <LoadingPage>
      <div className="grid gap-3">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-11 rounded-lg" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipsSkeleton count={2} />
        <Skeleton className="h-8 w-72 max-w-full rounded-lg" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      {[2, 9, 6].map((count, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <ChipsSkeleton count={count} />
        </div>
      ))}
    </LoadingPage>
  );
}
