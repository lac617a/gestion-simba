"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteTimeOff, type TimeOffFormState } from "@/app/actions/time-off";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIME_OFF_LABEL } from "@/lib/attendance";

type Props = {
  action: (state: TimeOffFormState, formData: FormData) => Promise<TimeOffFormState>;
  minDate: string;
};

export function TimeOffForm({ action, minDate }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  const values = state?.values;

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    // key: remonta el form cuando cambian los valores devueltos, para que los inputs no controlados los tomen.
    <form key={JSON.stringify(values ?? null)} action={formAction} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIME_OFF_LABEL) as (keyof typeof TIME_OFF_LABEL)[]).map((type, i) => (
            <label key={type} className="cursor-pointer">
              <input type="radio" name="type" value={type} defaultChecked={values ? values.type === type : i === 0} className="peer sr-only" />
              <span className="inline-flex h-9 items-center rounded-lg border px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                {TIME_OFF_LABEL[type]}
              </span>
            </label>
          ))}
        </div>
        {errors?.type && <p className="text-sm text-destructive">{errors.type[0]}</p>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-start gap-2">
          <Label htmlFor="startDate">Desde</Label>
          <Input id="startDate" name="startDate" type="date" min={minDate} defaultValue={values?.startDate} required aria-invalid={!!errors?.startDate} />
          {errors?.startDate && <p className="text-sm text-destructive">{errors.startDate[0]}</p>}
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="endDate">Hasta</Label>
          <Input id="endDate" name="endDate" type="date" min={minDate} defaultValue={values?.endDate} aria-invalid={!!errors?.endDate} />
          {errors?.endDate && <p className="text-sm text-destructive">{errors.endDate[0]}</p>}
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Deja “Hasta” vacío para un solo día.</p>

      <div className="grid gap-2">
        <Label htmlFor="note">Nota</Label>
        <Input id="note" name="note" maxLength={120} defaultValue={values?.note} placeholder="Opcional" aria-invalid={!!errors?.note} />
        {errors?.note && <p className="text-sm text-destructive">{errors.note[0]}</p>}
      </div>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="outline" className="justify-self-start" disabled={pending}>
        {pending ? "Asignando…" : "Asignar días libres"}
      </Button>
    </form>
  );
}

export function DeleteTimeOffButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Quitar días libres"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteTimeOff(id);
          toast.success("Días libres quitados");
        })
      }
    >
      <Trash2Icon />
    </Button>
  );
}
