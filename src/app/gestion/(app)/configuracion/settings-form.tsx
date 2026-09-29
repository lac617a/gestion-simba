"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAYS, WEEKDAYS_SHORT, weekdayPlural } from "@/lib/employees";
import { parseHours } from "@/lib/hours";
import type { AppSettings } from "@/lib/settings";

const SELECT_CLASS =
  "h-9 w-full max-w-48 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Filas del horario, de lunes a domingo. */
const HOURS_ORDER = [1, 2, 3, 4, 5, 6, 0];
const rowLabel = (i: number) => WEEKDAYS[i];

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [state, action, pending] = useActionState(updateSettings, undefined);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    // key: tras guardar se remonta con los valores nuevos que llegan del servidor
    <form key={JSON.stringify(settings)} action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="whatsapp">WhatsApp del restaurante</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          defaultValue={settings.whatsapp}
          className="max-w-48"
          required
        />
        <p className="text-xs text-muted-foreground">
          La página pública manda aquí las reservas y los pedidos de los clientes.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payWeekStart">La semana de pago empieza el</Label>
        <select
          id="payWeekStart"
          name="payWeekStart"
          defaultValue={settings.payWeekStart}
          className={SELECT_CLASS}
        >
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Define la “Semana” en Pagos, Reportes y Hoy.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payDay">La semana se paga el</Label>
        <select id="payDay" name="payDay" defaultValue={settings.payDay} className={SELECT_CLASS}>
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          El primero después de terminar la semana. Ese día, Hoy muestra cuánto hay que pagar hasta que quede pagado.
        </p>
      </div>

      <OpeningHoursFields initial={settings.openingHours} />

      <DoubleShiftFields weekdays={settings.doubleShiftWeekdays} shiftHours={settings.shiftHours} />

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

/** Horario de atención por día (informativo). Vacío = sin horario. */
function OpeningHoursFields({ initial }: { initial: string[] }) {
  const [hours, setHours] = useState(() =>
    Array.from({ length: 7 }, (_, i) => parseHours(initial[i]) ?? { open: "", close: "" })
  );
  const set = (i: number, key: "open" | "close", value: string) =>
    setHours((h) => h.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  // "Copiar": el primer horario completo (en el orden de la tabla) pasa a los días vacíos.
  const first = HOURS_ORDER.map((i) => hours[i]).find((h) => h.open && h.close);
  const hasEmpty = hours.some((h) => !h.open && !h.close);
  const fillEmpty = () => first && setHours((h) => h.map((row) => (!row.open && !row.close ? first : row)));

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Horario de atención</legend>
      {/* En celular el nombre del día va arriba: así las horas caben con "a. m./p. m." */}
      <div className="grid grid-cols-2 items-center gap-x-2 gap-y-1.5 text-sm sm:grid-cols-[5.5rem_1fr_1fr]">
        <span className="hidden sm:block" />
        <span className="text-xs text-muted-foreground">Abre</span>
        <span className="text-xs text-muted-foreground">Cierra</span>
        {HOURS_ORDER.map((i) => (
          <div key={i} className="contents">
            <label htmlFor={`open${i}`} className="col-span-2 mt-1.5 font-medium sm:col-span-1 sm:mt-0 sm:font-normal">
              {rowLabel(i)}
            </label>
            <Input
              id={`open${i}`}
              name={`open${i}`}
              type="time"
              value={hours[i].open}
              onChange={(e) => set(i, "open", e.target.value)}
              aria-label={`${rowLabel(i)}: abre`}
            />
            <Input
              name={`close${i}`}
              type="time"
              value={hours[i].close}
              onChange={(e) => set(i, "close", e.target.value)}
              aria-label={`${rowLabel(i)}: cierra`}
            />
          </div>
        ))}
      </div>
      {first && hasEmpty && (
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={fillEmpty}>
          Usar {first.open}–{first.close} en los días vacíos
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Se muestra en la página pública, en Hoy y en Asistencia. Llena todos los días; un día vacío sale sin horario.
      </p>
    </fieldset>
  );
}

/** Días con doble turno y horario de cada turno (propinas por turno, pago por turno). */
function DoubleShiftFields({ weekdays, shiftHours }: { weekdays: number[]; shiftHours: string[] }) {
  const shifts = [0, 1].map((i) => parseHours(shiftHours[i]) ?? { open: "", close: "" });
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium">Doble turno</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Días con doble turno">
        {HOURS_ORDER.map((i) => (
          <label key={i} className="cursor-pointer">
            <input
              type="checkbox"
              name="doubleShiftWeekdays"
              value={i}
              defaultChecked={weekdays.includes(i)}
              aria-label={`Doble turno los ${weekdayPlural(i)}`}
              className="peer sr-only"
            />
            <span
              title={WEEKDAYS[i]}
              className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg border px-3 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
            >
              {WEEKDAYS_SHORT[i]}
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-sm">
        <span />
        <span className="text-xs text-muted-foreground">Empieza</span>
        <span className="text-xs text-muted-foreground">Termina</span>
        {["Mañana", "Tarde"].map((label, i) => (
          <div key={label} className="contents">
            <label htmlFor={`shiftOpen${i}`}>{label}</label>
            <Input id={`shiftOpen${i}`} name={`shiftOpen${i}`} type="time" defaultValue={shifts[i].open} required />
            <Input
              name={`shiftClose${i}`}
              type="time"
              defaultValue={shifts[i].close}
              aria-label={`${label}: termina`}
              required
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Esos días hay turno de mañana y de tarde: cada empleado que trabajó se marca en Mañana, Tarde o Ambos. Las
        propinas se reparten por turno y el pago es la tarifa del puesto por cada turno (Ambos = doble).
      </p>
    </fieldset>
  );
}
