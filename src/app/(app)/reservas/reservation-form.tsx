"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ReservationFormState, ReservationFormValues } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_PARTY_SIZE, OCCASIONS, OTHER_OCCASION } from "@/lib/reservations";

type Props = {
  action: (state: ReservationFormState, formData: FormData) => Promise<ReservationFormState>;
  defaults: ReservationFormValues;
  submitLabel: string;
  autoFocus?: boolean;
};

const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive placeholder:text-muted-foreground md:text-sm dark:bg-input/30";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ReservationForm({ action, defaults, submitLabel, autoFocus }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // key: tras un error se remonta con lo enviado (React vacía el form tras la acción)
  return (
    <Fields
      key={JSON.stringify(state?.values ?? null)}
      state={state}
      formAction={formAction}
      pending={pending}
      values={state?.values ?? defaults}
      submitLabel={submitLabel}
      autoFocus={autoFocus}
    />
  );
}

function Fields({
  state,
  formAction,
  pending,
  values,
  submitLabel,
  autoFocus,
}: {
  state: ReservationFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  values: ReservationFormValues;
  submitLabel: string;
  autoFocus?: boolean;
}) {
  const errors = state?.errors;
  const [occasion, setOccasion] = useState(values.occasionChoice);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="grid content-start gap-2">
          <Label htmlFor="date">Fecha *</Label>
          <Input id="date" name="date" type="date" defaultValue={values.date} aria-invalid={!!errors?.date} required />
          <FieldError messages={errors?.date} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="time">Hora *</Label>
          <Input id="time" name="time" type="time" defaultValue={values.time} aria-invalid={!!errors?.time} required />
          <FieldError messages={errors?.time} />
        </div>
        <div className="col-span-2 grid content-start gap-2 sm:col-span-1">
          <Label htmlFor="partySize">Personas *</Label>
          <Input
            id="partySize"
            name="partySize"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PARTY_SIZE}
            defaultValue={values.partySize}
            aria-invalid={!!errors?.partySize}
            className="max-w-32"
            required
          />
          <FieldError messages={errors?.partySize} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="customerName">A nombre de *</Label>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={values.customerName}
            aria-invalid={!!errors?.customerName}
            autoFocus={autoFocus}
            autoComplete="off"
            required
          />
          <FieldError messages={errors?.customerName} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={values.phone}
            aria-invalid={!!errors?.phone}
          />
          <FieldError messages={errors?.phone} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="occasionChoice">Ocasión</Label>
          <select
            id="occasionChoice"
            name="occasionChoice"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className={`${FIELD_CLASS} h-8`}
          >
            <option value="">Ninguna</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER_OCCASION}>Otra…</option>
          </select>
          {occasion === OTHER_OCCASION && (
            <Input
              name="occasionOther"
              defaultValue={values.occasionOther}
              placeholder="¿Cuál ocasión?"
              aria-label="Otra ocasión"
              aria-invalid={!!errors?.occasion}
              autoFocus
            />
          )}
          <FieldError messages={errors?.occasion} />
        </div>
        {occasion && (
          <div className="grid content-start gap-2">
            <Label htmlFor="honoree">Persona de la ocasión</Label>
            <Input
              id="honoree"
              name="honoree"
              defaultValue={values.honoree}
              placeholder="Ej. la cumpleañera"
              aria-invalid={!!errors?.honoree}
              autoComplete="off"
            />
            <FieldError messages={errors?.honoree} />
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">Observación</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={500}
          defaultValue={values.note}
          placeholder="Ej. mesa en la terraza, traen torta, silla para bebé…"
          aria-invalid={!!errors?.note}
          className={`${FIELD_CLASS} py-2`}
        />
        <FieldError messages={errors?.note} />
      </div>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {/* "Volver" y no "Cancelar": en la edición existe "Cancelar reserva" */}
        <Button variant="outline" size="lg" render={<Link href="/reservas" />} nativeButton={false}>
          Volver
        </Button>
      </div>
    </form>
  );
}
