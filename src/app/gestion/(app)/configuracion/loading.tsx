import { HeaderSkeleton, LoadingPage } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Configuración: secciones con sus campos. */
export default function Loading() {
  return (
    <LoadingPage className="max-w-2xl gap-6">
      <HeaderSkeleton title="w-48" />
      {[2, 3, 2].map((fields, i) => (
        <div key={i} className="grid gap-4 rounded-lg border p-4">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          {Array.from({ length: fields }, (_, j) => (
            <Skeleton key={j} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </LoadingPage>
  );
}
