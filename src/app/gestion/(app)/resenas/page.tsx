import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, PencilIcon, PlusIcon } from "lucide-react";
import { FlashToast } from "@/components/flash-toast";
import { Stars } from "@/components/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { GOOGLE_REVIEWS_URL, relativeDate } from "@/lib/reviews";
import { getReviews } from "@/lib/reviews-data";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { RatingSummaryForm, ReviewControls } from "./review-controls";

export const metadata: Metadata = { title: "Reseñas · Gestión Simba" };

/** Reseñas que se muestran en la página pública (se copian a mano de Google). */
export default async function ReviewsPage({ searchParams }: PageProps<"/gestion/resenas">) {
  await verifySession();
  const params = await searchParams;
  const [reviews, settings] = await Promise.all([getReviews({ onlyVisible: false }), getSettings()]);
  const t = today();
  const visible = reviews.filter((r) => r.visible).length;

  const flash = params.creado
    ? "Reseña agregada"
    : params.actualizado
      ? "Cambios guardados"
      : params.eliminado
        ? "Reseña eliminada"
        : null;

  return (
    <div className="grid max-w-3xl gap-6">
      {flash && <FlashToast message={flash} />}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reseñas</h1>
          <p className="text-sm text-muted-foreground">
            Las que salen en la página pública. {visible} de {reviews.length} visibles.
          </p>
        </div>
        <Button render={<Link href="/gestion/resenas/nueva" />} nativeButton={false} size="lg">
          <PlusIcon />
          Nueva
        </Button>
      </div>

      <section className="grid gap-3 rounded-lg border p-4">
        <div>
          <h2 className="font-medium">Calificación en Google</h2>
          <p className="text-sm text-muted-foreground">
            Cópiala de la ficha de Google de vez en cuando; la página la muestra arriba de las reseñas.{" "}
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
              Abrir en Google <ExternalLinkIcon className="size-3" />
            </a>
          </p>
        </div>
        <RatingSummaryForm rating={settings.googleRating} count={settings.googleReviewCount} />
      </section>

      {reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Todavía no hay reseñas. Copia las mejores de Google con “Nueva”.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {reviews.map((r, i) => (
            <li key={r.id} className={cn("grid gap-2 px-4 py-3", !r.visible && "bg-muted/40")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{r.author}</span>
                  <Stars value={r.rating} className="text-sm text-amber-500" />
                  <span className="text-xs text-muted-foreground">{relativeDate(r.reviewedAt, t)}</span>
                  {!r.visible && <Badge variant="secondary">Oculta</Badge>}
                </div>
                <div className="flex items-center">
                  <ReviewControls id={r.id} visible={r.visible} first={i === 0} last={i === reviews.length - 1} />
                  <Button variant="ghost" size="sm" render={<Link href={`/gestion/resenas/${r.id}`} />} nativeButton={false}>
                    <PencilIcon /> Editar
                  </Button>
                </div>
              </div>
              <p className={cn("text-sm", !r.visible && "text-muted-foreground")}>{r.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
