import { ChipsSkeleton, ListSkeleton, LoadingPage } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Hoy (y cualquier pantalla sin su propio loading.tsx): avisos, reservas de hoy y quién está hoy. */
export default function Loading() {
  return (
    <LoadingPage className="gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-3">
        <Skeleton className="h-6 w-40" />
        <ListSkeleton rows={2} />
      </div>
      <div className="grid gap-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-2 w-full rounded-full" />
        <ChipsSkeleton count={10} />
      </div>
    </LoadingPage>
  );
}
