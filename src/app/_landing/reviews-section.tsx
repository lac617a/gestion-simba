import { PencilLineIcon } from "lucide-react";
import { Stars } from "@/components/stars";
import type { ISODate } from "@/lib/dates";
import { formatRating, GOOGLE_REVIEWS_URL, GOOGLE_WRITE_REVIEW_URL, relativeDate } from "@/lib/reviews";
import type { ReviewRow } from "@/lib/reviews-data";

type Props = { reviews: ReviewRow[]; rating: number; count: number; today: ISODate };

/** "Lo que dicen nuestros clientes": reseñas elegidas en /gestion/resenas + enlaces a Google. */
export function ReviewsSection({ reviews, rating, count, today }: Props) {
  if (reviews.length === 0) return null;
  return (
    <section id="resenas" className="scroll-mt-14 bg-simba-green">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-simba-gold uppercase">Reseñas</p>
            <h2 className="mt-1 font-display text-4xl sm:text-5xl">Lo que dicen nuestros clientes</h2>
          </div>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/15 px-4 py-3 hover:bg-white/5"
          >
            <span className="font-display text-4xl leading-none">{formatRating(rating)}</span>
            <span className="grid gap-1">
              <Stars value={rating} className="text-lg text-simba-gold" />
              <span className="text-sm text-simba-cream/75">{count.toLocaleString("es-CO")} opiniones en Google</span>
            </span>
          </a>
        </div>

        {/* En celular se desliza de lado; en pantallas grandes, cuadrícula */}
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex w-[85%] shrink-0 snap-center flex-col gap-4 rounded-2xl bg-simba-cream p-6 text-simba-forest shadow-lg sm:w-80 md:w-auto"
            >
              <Stars value={r.rating} className="text-lg text-simba-gold" />
              <blockquote className="flex-1 text-[15px] leading-relaxed">“{r.text}”</blockquote>
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">{r.author}</span>
                <span className="text-simba-forest/60">{relativeDate(r.reviewedAt, today)}</span>
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={GOOGLE_WRITE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-simba-gold px-5 font-semibold text-simba-green hover:bg-simba-gold/90"
          >
            <PencilLineIcon className="size-4" /> Déjanos tu reseña
          </a>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-full border border-white/40 px-5 font-semibold hover:bg-white/10"
          >
            Ver todas en Google
          </a>
        </div>
        <p className="mt-4 text-xs text-simba-cream/50">Reseñas publicadas en Google por nuestros clientes.</p>
      </div>
    </section>
  );
}
