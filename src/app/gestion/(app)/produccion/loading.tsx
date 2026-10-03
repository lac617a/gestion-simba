import { ChipsSkeleton, HeaderSkeleton, LoadingPage, TabsSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Producción: pestañas y jornadas con sus asistentes. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-44" subtitle action />
      <TabsSkeleton />
      <div className="divide-y rounded-lg border">
        {[4, 3, 5].map((count, i) => (
          <div key={i} className="grid gap-3 px-4 py-3.5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
            <ChipsSkeleton count={count} />
          </div>
        ))}
      </div>
    </LoadingPage>
  );
}
