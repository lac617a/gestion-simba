"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { DEFAULT_CLOSED_WEEKDAYS, DEFAULT_PAY_WEEK_START } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isoToDate } from "@/lib/dates";
import { parseRatingSummaryForm, parseReviewForm, type ReviewFieldErrors } from "@/lib/reviews";

export type ReviewFormValues = { author: string; rating: string; text: string; reviewedAt: string; visible: boolean };
export type ReviewFormState = { errors?: ReviewFieldErrors; message?: string; values?: ReviewFormValues } | undefined;

function submittedValues(formData: FormData): ReviewFormValues {
  const get = (k: string) => String(formData.get(k) ?? "");
  return {
    author: get("author"),
    rating: get("rating"),
    text: get("text"),
    reviewedAt: get("reviewedAt"),
    visible: formData.get("visible") === "on",
  };
}

function refresh() {
  revalidatePath("/gestion/resenas", "layout");
  revalidatePath("/"); // página pública
}

export async function createReview(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  await verifySession();
  const parsed = parseReviewForm(formData);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };

  // Las nuevas van primero: suelen ser las más recientes.
  const first = await db.review.aggregate({ _min: { position: true } });
  const { reviewedAt, ...data } = parsed.data;
  await db.review.create({
    data: { ...data, reviewedAt: isoToDate(reviewedAt), position: (first._min.position ?? 1) - 1 },
  });
  refresh();
  redirect("/gestion/resenas?creado=1");
}

export async function updateReview(id: string, _prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  await verifySession();
  const parsed = parseReviewForm(formData);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };

  const { reviewedAt, ...data } = parsed.data;
  const { count } = await db.review.updateMany({ where: { id }, data: { ...data, reviewedAt: isoToDate(reviewedAt) } });
  if (count === 0) return { message: "La reseña ya no existe", values: submittedValues(formData) };
  refresh();
  redirect("/gestion/resenas?actualizado=1");
}

export async function setReviewVisible(id: string, visible: boolean) {
  await verifySession();
  await db.review.updateMany({ where: { id }, data: { visible } });
  refresh();
}

/** Sube (-1) o baja (+1) una reseña intercambiando su lugar con la vecina. */
export async function moveReview(id: string, dir: -1 | 1) {
  await verifySession();
  const all = await db.review.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = all.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  // Renumera todo (así no hay empates de posición)
  await db.$transaction(all.map((r, k) => db.review.update({ where: { id: r.id }, data: { position: k + 1 } })));
  refresh();
}

export async function deleteReview(id: string) {
  await verifySession();
  await db.review.deleteMany({ where: { id } });
  refresh();
  redirect("/gestion/resenas?eliminado=1");
}

export type RatingSummaryState = { error?: string; success?: string } | undefined;

/** Calificación y total de opiniones de Google (se copian de la ficha). */
export async function updateRatingSummary(_prev: RatingSummaryState, formData: FormData): Promise<RatingSummaryState> {
  await verifySession();
  const parsed = parseRatingSummaryForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.appSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, payWeekStart: DEFAULT_PAY_WEEK_START, closedWeekdays: DEFAULT_CLOSED_WEEKDAYS, ...parsed.data },
  });
  refresh();
  return { success: "Calificación guardada." };
}
