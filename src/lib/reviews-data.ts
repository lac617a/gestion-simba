import "server-only";
import { db } from "@/lib/db";
import { dateToISO } from "@/lib/dates";

/** Reseñas en el orden de la página. Solo las visibles para la página pública. */
export async function getReviews({ onlyVisible }: { onlyVisible: boolean }) {
  const rows = await db.review.findMany({
    where: onlyVisible ? { visible: true } : undefined,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    omit: { createdAt: true, updatedAt: true },
  });
  return rows.map((r) => ({ ...r, reviewedAt: dateToISO(r.reviewedAt) }));
}

export type ReviewRow = Awaited<ReturnType<typeof getReviews>>[number];

export async function getReview(id: string) {
  const r = await db.review.findUnique({ where: { id } });
  return r && { ...r, reviewedAt: dateToISO(r.reviewedAt) };
}
