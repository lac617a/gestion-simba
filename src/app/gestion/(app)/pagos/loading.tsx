import { HeaderSkeleton, ListSkeleton, LoadingPage, PeriodSkeleton, StatsSkeleton } from "@/components/page-skeletons";

/** Pagos: periodo, totales y lo de cada empleado. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-28" />
      <PeriodSkeleton />
      <StatsSkeleton count={3} />
      <ListSkeleton rows={6} />
    </LoadingPage>
  );
}
