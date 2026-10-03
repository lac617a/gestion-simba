import { HeaderSkeleton, ListSkeleton, LoadingPage } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Reseñas: calificación de Google y la lista. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-36" subtitle action />
      <Skeleton className="h-28 rounded-lg" />
      <ListSkeleton rows={5} />
    </LoadingPage>
  );
}
