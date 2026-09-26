import { describe, expect, it } from "vitest";
import { formatRating, parseRatingSummaryForm, parseReviewForm, relativeDate } from "./reviews";

const TODAY = "2026-09-26";

describe("fecha relativa (como en Google)", () => {
  it.each([
    ["2026-09-26", "hoy"],
    ["2026-09-23", "hace 3 días"],
    ["2026-09-19", "hace 1 semana"],
    ["2026-09-05", "hace 3 semanas"],
    ["2026-08-26", "hace 1 mes"],
    ["2026-01-26", "hace 8 meses"],
    ["2025-09-26", "hace 1 año"],
    ["2023-06-01", "hace 3 años"],
    ["2026-10-01", "hoy"], // fecha futura por error
  ])("%s → %s", (date, label) => {
    expect(relativeDate(date, TODAY)).toBe(label);
  });
});

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ author: "Laura G.", rating: "5", text: "Muy rico todo", reviewedAt: "2026-09-01", ...fields })) {
    fd.append(k, v);
  }
  return fd;
}

describe("formulario de reseña", () => {
  it("válida; el checkbox decide si se muestra", () => {
    expect(parseReviewForm(form({ visible: "on" })).data).toEqual({
      author: "Laura G.",
      rating: 5,
      text: "Muy rico todo",
      reviewedAt: "2026-09-01",
      visible: true,
    });
    expect(parseReviewForm(form({})).data?.visible).toBe(false);
  });

  it("valida nombre, estrellas, texto y fecha", () => {
    expect(parseReviewForm(form({ author: " " })).success).toBe(false);
    expect(parseReviewForm(form({ rating: "6" })).success).toBe(false);
    expect(parseReviewForm(form({ rating: "0" })).success).toBe(false);
    expect(parseReviewForm(form({ text: "ok" })).success).toBe(false);
    expect(parseReviewForm(form({ text: "x".repeat(601) })).success).toBe(false);
    expect(parseReviewForm(form({ reviewedAt: "" })).success).toBe(false);
  });
});

describe("calificación de Google", () => {
  const summary = (googleRating: string, googleReviewCount: string) => {
    const fd = new FormData();
    fd.append("googleRating", googleRating);
    fd.append("googleReviewCount", googleReviewCount);
    return parseRatingSummaryForm(fd);
  };

  it("acepta coma o punto y redondea a un decimal", () => {
    expect(summary("4,6", "243").data).toEqual({ googleRating: 4.6, googleReviewCount: 243 });
    expect(summary("4.75", "10").data?.googleRating).toBe(4.8);
  });

  it("fuera de rango o vacío", () => {
    expect(summary("5,5", "10").success).toBe(false);
    expect(summary("abc", "10").success).toBe(false);
    expect(summary("4,6", "-1").success).toBe(false);
    expect(summary("4,6", "2.5").success).toBe(false);
  });

  it("se muestra con coma", () => {
    expect(formatRating(4.6)).toBe("4,6");
    expect(formatRating(5)).toBe("5,0");
  });
});
