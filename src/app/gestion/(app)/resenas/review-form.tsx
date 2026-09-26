"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReviewFormState, ReviewFormValues } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  action: (state: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
  defaults: ReviewFormValues;
  submitLabel: string;
};

const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ReviewForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  const values = state?.values ?? defaults;

  return (
    // key: tras un error se remonta con lo enviado (React vacía el form tras la acción)
    <form key={JSON.stringify(state?.values ?? null)} action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid content-start gap-2">
          <Label htmlFor="author">Nombre *</Label>
          <Input id="author" name="author" defaultValue={values.author} placeholder="Ej. Laura G." aria-invalid={!!errors?.author} required />
          <FieldError messages={errors?.author} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="rating">Estrellas *</Label>
          <select id="rating" name="rating" defaultValue={values.rating} className={`${FIELD_CLASS} h-8`}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} {n}
              </option>
            ))}
          </select>
          <FieldError messages={errors?.rating} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="reviewedAt">Fecha *</Label>
          <Input id="reviewedAt" name="reviewedAt" type="date" defaultValue={values.reviewedAt} aria-invalid={!!errors?.reviewedAt} required />
          <FieldError messages={errors?.reviewedAt} />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Nombre abreviado (nombre e inicial del apellido). La fecha puede ser aproximada: la página muestra “hace 3 meses”.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="text">Reseña *</Label>
        <textarea
          id="text"
          name="text"
          rows={5}
          maxLength={600}
          defaultValue={values.text}
          aria-invalid={!!errors?.text}
          className={`${FIELD_CLASS} py-2`}
          required
        />
        <FieldError messages={errors?.text} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visible" defaultChecked={values.visible} className="size-4 accent-primary" />
        Mostrar en la página pública
      </label>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/gestion/resenas" />} nativeButton={false}>
          Volver
        </Button>
      </div>
    </form>
  );
}
