"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/employees";
import type { AppSettings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action, pending] = useActionState(updateSettings, undefined);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    // key: tras guardar se remonta con los valores nuevos que llegan del servidor
    <form key={JSON.stringify(settings)} action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="payWeekStart">La semana de pago empieza el</Label>
        <select
          id="payWeekStart"
          name="payWeekStart"
          defaultValue={settings.payWeekStart}
          className="h-9 w-full max-w-48 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Define la “Semana” en Pagos, Reportes y Hoy.</p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">El restaurante cierra los</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, i) => (
            <label key={day} className="cursor-pointer">
              <input
                type="checkbox"
                name="closedWeekdays"
                value={i}
                defaultChecked={settings.closedWeekdays.includes(i)}
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
          Si ese día es festivo, el restaurante abre y cierra el día siguiente. Para días puntuales usa las excepciones en
          Asistencia.
        </p>
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" className="justify-self-start" disabled={pending}>
        {pending ? "Guardando…" : "Guardar ajustes"}
      </Button>
    </form>
  );
}
