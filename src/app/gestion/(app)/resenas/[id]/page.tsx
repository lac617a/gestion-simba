import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateReview } from "@/app/actions/reviews";
import { verifySession } from "@/lib/dal";
import { getReview } from "@/lib/reviews-data";
import { ReviewForm } from "../review-form";
import { DeleteReviewButton } from "./delete-review";

export const metadata: Metadata = { title: "Editar reseña · Gestión Simba" };

export default async function EditReviewPage({ params }: PageProps<"/gestion/resenas/[id]">) {
  await verifySession();
  const { id } = await params;
  const r = await getReview(id);
  if (!r) notFound();

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Editar reseña</h1>
      <ReviewForm
        action={updateReview.bind(null, r.id)}
        submitLabel="Guardar cambios"
        defaults={{ author: r.author, rating: String(r.rating), text: r.text, reviewedAt: r.reviewedAt, visible: r.visible }}
      />
      <div className="border-t pt-5">
        <DeleteReviewButton id={r.id} author={r.author} />
      </div>
    </div>
  );
}
