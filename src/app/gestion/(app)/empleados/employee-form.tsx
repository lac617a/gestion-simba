"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EmployeeFormState, EmployeeFormValues } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateInputValue, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/employees";

type EmployeeDefaults = {
  name: string;
  position: string | null;
  phone: string | null;
  hireDate: Date | null;
  restDays: number[];
};

type Props = {
  action: (state: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  defaults?: EmployeeDefaults;
  submitLabel: string;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function EmployeeForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  // Tras un error se muestran los valores enviados; si no, los guardados.
  const values: EmployeeFormValues = state?.values ?? {
    name: defaults?.name ?? "",
    position: defaults?.position ?? "",
    phone: defaults?.phone ?? "",
    hireDate: toDateInputValue(defaults?.hireDate),
    restDays: defaults?.restDays ?? [],
  };

  return (
    // key: remonta el form cuando cambian los valores devueltos, para que los inputs no controlados los tomen.
    <form key={JSON.stringify(state?.values ?? null)} action={formAction} className="grid gap-5">
      <div className="grid content-start gap-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={values.name}
          aria-invalid={!!errors?.name}
          autoFocus={!defaults}
          required
        />
        <FieldError messages={errors?.name} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="position">Puesto</Label>
          <Input
            id="position"
            name="position"
            placeholder="Mesero, cocinero…"
            defaultValue={values.position}
            aria-invalid={!!errors?.position}
          />
          <FieldError messages={errors?.position} />
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

      <div className="grid gap-2 sm:max-w-[calc(50%-0.625rem)]">
        <Label htmlFor="hireDate">Fecha de ingreso</Label>
        <Input
          id="hireDate"
          name="hireDate"
          type="date"
          defaultValue={values.hireDate}
          aria-invalid={!!errors?.hireDate}
        />
        <FieldError messages={errors?.hireDate} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Día(s) de descanso fijo</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, i) => (
            <label key={day} className="cursor-pointer">
              <input
                type="checkbox"
                name="restDays"
                value={i}
                defaultChecked={values.restDays.includes(i)}
                className="peer sr-only"
              />
              <span
                title={day}
                className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg border px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
              >
                {WEEKDAYS_SHORT[i]}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Se marcará automáticamente como descanso en la asistencia diaria.
        </p>
        <FieldError messages={errors?.restDays} />
      </fieldset>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/gestion/empleados" />} nativeButton={false}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
