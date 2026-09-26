import * as z from "zod";
import { daysBetween, type ISODate } from "@/lib/dates";

/** Ficha del restaurante en Google (reseñas). Sin API: solo enlaces. */
const GOOGLE_PLACE = "0x8e6847a282529f4b:0xd05ea2be5825f90a";
const GOOGLE_SEARCH = "https://www.google.com/search?q=SIMBA+Restaurante+y+Comidas+R%C3%A1pidas+Piedecuesta";
export const GOOGLE_REVIEWS_URL = `${GOOGLE_SEARCH}#lrd=${GOOGLE_PLACE},1`;
/** Abre el cuadro "Escribir una opinión" de Google. */
export const GOOGLE_WRITE_REVIEW_URL = `${GOOGLE_SEARCH}#lrd=${GOOGLE_PLACE},3`;

export const ReviewSchema = z.object({
  author: z
    .string()
    .trim()
    .min(2, { error: "Escribe el nombre" })
    .max(40, { error: "Máximo 40 caracteres" }),
  rating: z.coerce.number().int().min(1, { error: "De 1 a 5 estrellas" }).max(5, { error: "De 1 a 5 estrellas" }),
  text: z
    .string()
    .trim()
    .min(5, { error: "Escribe la reseña" })
    .max(600, { error: "Máximo 600 caracteres" }),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Elige la fecha" }),
  visible: z.boolean(),
});

export type ReviewInput = z.output<typeof ReviewSchema>;
export type ReviewFieldErrors = Partial<Record<keyof ReviewInput, string[]>>;

export function parseReviewForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return ReviewSchema.safeParse({
    author: get("author"),
    rating: get("rating"),
    text: get("text"),
    reviewedAt: get("reviewedAt"),
    visible: formData.get("visible") === "on",
  });
}

/** Calificación general y total de opiniones que muestra Google (se copian a mano). */
export const RatingSummarySchema = z.object({
  googleRating: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .pipe(z.number({ error: "Calificación inválida" }).min(1, { error: "Entre 1 y 5" }).max(5, { error: "Entre 1 y 5" }))
    .transform((v) => Math.round(v * 10) / 10),
  googleReviewCount: z.coerce.number().int({ error: "Número entero" }).min(0).max(100_000),
});

export function parseRatingSummaryForm(formData: FormData) {
  return RatingSummarySchema.safeParse({
    googleRating: String(formData.get("googleRating") ?? ""),
    googleReviewCount: formData.get("googleReviewCount") ?? "",
  });
}

/** "4,6" */
export function formatRating(value: number) {
  return value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "always" });

/** "hace 3 días", "hace 2 semanas", "hace 8 meses", "hace 1 año" (como en Google). */
export function relativeDate(date: ISODate, today: ISODate) {
  const days = Math.max(0, daysBetween(date, today));
  if (days === 0) return "hoy";
  if (days < 7) return relative.format(-days, "day");
  if (days < 30) return relative.format(-Math.floor(days / 7), "week");
  // Meses de calendario completos (26 ene → 26 sep = 8), no días / 30
  const [y1, m1, d1] = date.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (months < 12) return relative.format(-Math.max(1, months), "month");
  return relative.format(-Math.floor(months / 12), "year");
}
