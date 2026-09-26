import type { Metadata } from "next";
import { createReview } from "@/app/actions/reviews";
import { today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { ReviewForm } from "../review-form";

export const metadata: Metadata = { title: "Nueva reseña · Gestión Simba" };

export default async function NewReviewPage() {
  await verifySession();
  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Nueva reseña</h1>
      <ReviewForm
        action={createReview}
        submitLabel="Agregar reseña"
        defaults={{ author: "", rating: "5", text: "", reviewedAt: today(), visible: true }}
      />
    </div>
  );
}
