"use client";

import { useActionState, useEffect, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";
import { moveReview, setReviewVisible, updateRatingSummary } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Subir / bajar y mostrar / ocultar una reseña. */
export function ReviewControls({ id, visible, first, last }: { id: string; visible: boolean; first: boolean; last: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Subir"
        disabled={pending || first}
        onClick={() => startTransition(() => moveReview(id, -1))}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Bajar"
        disabled={pending || last}
        onClick={() => startTransition(() => moveReview(id, 1))}
      >
        <ArrowDownIcon />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setReviewVisible(id, !visible);
            toast.success(visible ? "Reseña oculta" : "Reseña visible en la página");
          })
        }
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />} {visible ? "Ocultar" : "Mostrar"}
      </Button>
    </div>
  );
}

/** Calificación general y total de opiniones (copiados de la ficha de Google). */
export function RatingSummaryForm({ rating, count }: { rating: number; count: number }) {
  const [state, action, pending] = useActionState(updateRatingSummary, undefined);
  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form key={`${rating}-${count}`} action={action} className="flex flex-wrap items-end gap-3">
      <div className="grid gap-2">
        <Label htmlFor="googleRating">Calificación</Label>
        <Input
          id="googleRating"
          name="googleRating"
          inputMode="decimal"
          defaultValue={rating.toLocaleString("es-CO")}
          className="w-20"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="googleReviewCount">Opiniones</Label>
        <Input
          id="googleReviewCount"
          name="googleReviewCount"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={count}
          className="w-24"
          required
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {state?.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
