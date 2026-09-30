"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CalendarIcon, ClockIcon, MinusIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import type { ReservationFormState, ReservationFormValues } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localNow, type ISODate, type LocalNow } from "@/lib/dates";
import { formatHours, formatTime } from "@/lib/hours";
import { hoursOn, isPastSlot, quickDateLabel, quickDates, timeSlots } from "@/lib/reservation-slots";
import { MAX_PARTY_SIZE, OCCASIONS, OTHER_OCCASION, outsideHoursWarning } from "@/lib/reservations";
import type { ReservationFormContext } from "@/lib/reservations-data";
import { cn } from "@/lib/utils";

type Props = {
  action: (state: ReservationFormState, formData: FormData) => Promise<ReservationFormState>;
  defaults: ReservationFormValues;
  submitLabel: string;
  context: ReservationFormContext;
  /** Al editar: fecha y hora guardadas (una reserva vieja se puede corregir sin moverla) */
  saved?: { date: ISODate; time: string };
};

const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive placeholder:text-muted-foreground md:text-sm dark:bg-input/30";

/** Botón de opción (fecha u hora): se marca el elegido. */
const CHIP_CLASS =
  "rounded-lg border px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ReservationForm({ action, defaults, submitLabel, context, saved }: Props) {
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
      context={context}
      saved={saved}
    />
  );
}

/** La hora del restaurante, al minuto (arranca con la del servidor para no desentonar al hidratar). */
function useNow(initial: LocalNow, timeZone: string) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const tick = () => setNow(localNow(timeZone));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timeZone]);
  return now;
}

function Fields({
  state,
  formAction,
  pending,
  values,
  submitLabel,
  context,
  saved,
}: {
  state: ReservationFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  values: ReservationFormValues;
  submitLabel: string;
  context: ReservationFormContext;
  saved?: { date: ISODate; time: string };
}) {
  const errors = state?.errors;
  const [occasion, setOccasion] = useState(values.occasionChoice);
  const now = useNow(context.now, context.timeZone);

  const days = quickDates(context.today);
  const [date, setDate] = useState<ISODate>(values.date);
  const [otherDate, setOtherDate] = useState(!!values.date && !days.includes(values.date));
  const hours = hoursOn(date, context.openingHours);
  const allSlots = timeSlots(hours);

  // Lo guardado se respeta aunque ya haya pasado (corregir una reserva vieja).
  const isSaved = (d: string, t: string) => !!saved && saved.date === d && saved.time === t;
  const past = (d: string, t: string) => isPastSlot(d, t, now) && !isSaved(d, t);
  const slots = allSlots.filter((t) => !past(date, t) || isSaved(date, t));
  const hiddenPast = allSlots.length - slots.length;

  const [time, setTime] = useState(values.time);
  const [otherTime, setOtherTime] = useState(!!values.time && !allSlots.includes(values.time));
  const [clientError, setClientError] = useState<{ date?: string; time?: string }>({});
  // Al cambiar fecha u hora dejan de valer los errores que devolvió el servidor para ellas.
  const [edited, setEdited] = useState(false);
  const pickTime = (t: string, other: boolean) => {
    setOtherTime(other);
    setTime(t);
    setEdited(true);
    setClientError((e) => ({ ...e, time: undefined }));
  };

  const minDate = saved && saved.date < context.today ? saved.date : context.today;
  const closedDay = context.closedDates.includes(date);
  const timePast = !!date && !!time && past(date, time);
  const outside = time && otherTime ? outsideHoursWarning(hours, time) : null;

  function chooseDate(next: ISODate) {
    setDate(next);
    setEdited(true);
    setClientError({});
    // Si la hora elegida ya pasó ese día o no está entre sus horas, se vuelve a elegir.
    if (time && !otherTime && (past(next, time) || !timeSlots(hoursOn(next, context.openingHours)).includes(time))) {
      setTime("");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const missing = { date: date ? undefined : "Elige la fecha", time: time ? undefined : "Elige la hora" };
    if (missing.date || missing.time) {
      e.preventDefault();
      setClientError(missing);
    } else if (timePast) {
      e.preventDefault();
    }
  }

  const dateError = clientError.date ?? (edited ? undefined : errors?.date?.[0]);
  const timeError =
    (timePast ? "Esa hora ya pasó: elige una desde ahora" : undefined) ??
    clientError.time ??
    (edited ? undefined : errors?.time?.[0]);

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-5">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />

      {/* ---------- Fecha ---------- */}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Fecha *</legend>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {days.map((d) => {
            const label = quickDateLabel(d, context.today);
            const closed = context.closedDates.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={!otherDate && date === d}
                disabled={closed}
                onClick={() => {
                  setOtherDate(false);
                  chooseDate(d);
                }}
                className={cn(CHIP_CLASS, "grid leading-tight")}
              >
                <span className="font-medium first-letter:uppercase">{label.top}</span>
                <span className="text-xs opacity-80">{closed ? "Cerrado" : label.bottom}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={otherDate}
            onClick={() => setOtherDate(true)}
            className={cn(CHIP_CLASS, "grid place-items-center leading-tight")}
          >
            <CalendarIcon className="size-4" />
            <span className="text-xs">Otra fecha</span>
          </button>
        </div>
        {otherDate && (
          <Input
            type="date"
            aria-label="Otra fecha"
            min={minDate}
            value={date}
            onChange={(e) => chooseDate(e.target.value)}
            aria-invalid={!!dateError}
            className="max-w-48"
          />
        )}
        {closedDay && (
          <Warning>Ese día está marcado como cerrado.</Warning>
        )}
        {dateError && <p className="text-sm text-destructive">{dateError}</p>}
      </fieldset>

      {/* ---------- Hora ---------- */}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          Hora *
          {hours && <span className="font-normal text-muted-foreground"> · abre de {formatHours(hours)}</span>}
        </legend>
        {slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {slots.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={!otherTime && time === t}
                onClick={() => pickTime(t, false)}
                className={cn(CHIP_CLASS, "tabular-nums")}
              >
                {formatTime(t)}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={otherTime}
              onClick={() => pickTime(time, true)}
              className={cn(CHIP_CLASS, "inline-flex items-center justify-center gap-1 whitespace-nowrap")}
            >
              <ClockIcon className="size-3.5" /> Otra hora
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {date === now.date ? "Ya no quedan horas para hoy. Elige otra fecha." : "Elige primero la fecha."}
          </p>
        )}
        {otherTime && slots.length > 0 && (
          <Input
            type="time"
            aria-label="Otra hora"
            step={300}
            value={time}
            onChange={(e) => pickTime(e.target.value, true)}
            aria-invalid={!!timeError}
            className="max-w-40"
          />
        )}
        {hiddenPast > 0 && slots.length > 0 && (
          <p className="text-xs text-muted-foreground">Las horas que ya pasaron no aparecen.</p>
        )}
        {outside && !timePast && <Warning>{outside}</Warning>}
        {timeError && <p className="text-sm text-destructive">{timeError}</p>}
      </fieldset>

      {/* ---------- Personas ---------- */}
      <PartySize defaultValue={values.partySize} errors={errors?.partySize} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="customerName">A nombre de *</Label>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={values.customerName}
            aria-invalid={!!errors?.customerName}
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
        <Button type="submit" size="lg" disabled={pending || timePast}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {/* "Volver" y no "Cancelar": en la edición existe "Cancelar reserva" */}
        <Button variant="outline" size="lg" render={<Link href="/gestion/reservas" />} nativeButton={false}>
          Volver
        </Button>
      </div>
    </form>
  );
}

/** Personas con botones − y + (también se puede escribir el número). */
function PartySize({ defaultValue, errors }: { defaultValue: string; errors?: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const n = Number(value) || 0;
  const set = (next: number) => setValue(String(Math.min(MAX_PARTY_SIZE, Math.max(1, next))));

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor="partySize">Personas *</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon-lg" aria-label="Una persona menos" disabled={n <= 1} onClick={() => set(n - 1)}>
          <MinusIcon />
        </Button>
        <Input
          id="partySize"
          name="partySize"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_PARTY_SIZE}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!!errors}
          className="h-9 w-16 text-center text-base tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          required
        />
        <Button type="button" variant="outline" size="icon-lg" aria-label="Una persona más" disabled={n >= MAX_PARTY_SIZE} onClick={() => set(n + 1)}>
          <PlusIcon />
        </Button>
      </div>
      <FieldError messages={errors} />
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-sm text-amber-700">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
