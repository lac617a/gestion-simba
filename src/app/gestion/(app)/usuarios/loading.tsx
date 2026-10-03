import { HeaderSkeleton, ListSkeleton, LoadingPage } from "@/components/page-skeletons";

/** Usuarios: la lista. */
export default function Loading() {
  return (
    <LoadingPage>
      <HeaderSkeleton title="w-36" subtitle action />
      <ListSkeleton rows={3} />
    </LoadingPage>
  );
}
