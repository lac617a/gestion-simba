"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { updateSettings, type SettingsState } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsGroup } from "@/lib/account";
import { WEEKDAYS, WEEKDAYS_SHORT, weekdayPlural } from "@/lib/employees";
import { parseHours } from "@/lib/hours";
import { MAX_OCCASIONS } from "@/lib/reservations";

const SELECT_CLASS =
  "h-9 w-full max-w-48 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Filas del horario, de lunes a domingo. */
const HOURS_ORDER = [1, 2, 3, 4, 5, 6, 0];
const rowLabel = (i: number) => WEEKDAYS[i];

/** Cada formulario guarda solo su grupo de ajustes. */
const SAVE: Record<SettingsGroup, (prev: SettingsState, formData: FormData) => Promise<SettingsState>> = {
  restaurante: updateSettings.bind(null, "restaurante"),
  horario: updateSettings.bind(null, "horario"),
  turnos: updateSettings.bind(null, "turnos"),
  "semana-de-pago": updateSettings.bind(null, "semana-de-pago"),
  reservas: updateSettings.bind(null, "reservas"),
  ocasiones: updateSettings.bind(null, "ocasiones"),
};

/** Formulario de un grupo: guarda, avisa y muestra el error. `resetKey` lo remonta con lo que llega del servidor. */
function GroupForm({ group, resetKey, children }: { group: SettingsGroup; resetKey: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(SAVE[group], undefined);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form key={resetKey} action={action} className="grid gap-5">
      {children}
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="justify-self-start" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

/** WhatsApp del restaurante (a donde escribe la página pública). */
export function WhatsappForm({ whatsapp }: { whatsapp: string }) {
  return (
    <GroupForm group="restaurante" resetKey={whatsapp}>
      <div className="grid gap-2">
        <Label htmlFor="whatsapp">WhatsApp del restaurante</Label>
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={whatsapp} className="max-w-48" required />
        <p className="text-xs text-muted-foreground">
          La página pública manda aquí las reservas y los pedidos de los clientes.
        </p>
      </div>
    </GroupForm>
  );
}

/** Correos de las reservas: recordatorio 1 hora antes e invitaciones de Google Calendar. */
export function ReservationEmailsForm({ reminderEmail, calendarEmail }: { reminderEmail: string; calendarEmail: string }) {
  return (
    <GroupForm group="reservas" resetKey={`${reminderEmail}|${calendarEmail}`}>
      <div className="grid gap-2">
        <Label htmlFor="reminderEmail">Correo de recordatorios de reservas</Label>
        <Input
          id="reminderEmail"
          name="reminderEmail"
          type="email"
          defaultValue={reminderEmail}
          placeholder="Vacío = sin recordatorios"
          className="max-w-80"
        />
        <p className="text-xs text-muted-foreground">
          Aquí llega un correo 1 hora antes de cada reserva confirmada. Si lo cambias, los recordatorios que ya estaban
          programados siguen yendo al correo anterior; las reservas nuevas o editadas usan el nuevo.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="calendarEmail">Google Calendar de reservas</Label>
        <Input
          id="calendarEmail"
          name="calendarEmail"
          type="email"
          defaultValue={calendarEmail}
          placeholder="Vacío = sin calendario"
          className="max-w-80"
        />
        <p className="text-xs text-muted-foreground">
          Cada reserva llega a este correo como invitación y Google Calendar la agrega sola (en su configuración,
          “Agregar invitaciones a mi calendario” debe estar en “De todos”). Al editarla se actualiza; al cancelarla o
          eliminarla, se quita.
        </p>
      </div>
    </GroupForm>
  );
}

/** Ocasiones del selector de las reservas: agregar, renombrar, ordenar y quitar. */
export function OccasionsForm({ occasions }: { occasions: string[] }) {
  return (
    <GroupForm group="ocasiones" resetKey={occasions.join("|")}>
      <OccasionRows initial={occasions} />
    </GroupForm>
  );
}

function OccasionRows({ initial }: { initial: string[] }) {
  const [rows, setRows] = useState(() => initial.map((name, i) => ({ key: i, name })));
  const [added, setAdded] = useState<number | null>(null);
  const set = (key: number, name: string) => setRows((r) => r.map((row) => (row.key === key ? { ...row, name } : row)));
  const move = (i: number, to: number) =>
    setRows((r) => {
      const next = [...r];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });
  const add = () => {
    const key = Math.max(-1, ...rows.map((r) => r.key)) + 1;
    setRows((r) => [...r, { key, name: "" }]);
    setAdded(key);
  };

  return (
    <div className="grid gap-3">
      <ol className="grid gap-2">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-1">
            <Input
              name="occasions"
              value={r.name}
              onChange={(e) => set(r.key, e.target.value)}
              placeholder="Ej. Bautizo"
              aria-label={`Ocasión ${i + 1}`}
              maxLength={60}
              autoFocus={r.key === added}
              className="mr-1 max-w-72 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Subir ${r.name || "ocasión"}`}
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Bajar ${r.name || "ocasión"}`}
              disabled={i === rows.length - 1}
              onClick={() => move(i, i + 1)}
            >
              <ArrowDownIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar ${r.name || "ocasión"}`}
              onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ol>
      {rows.length < MAX_OCCASIONS && (
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={add}>
          <PlusIcon /> Agregar ocasión
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Salen en este orden en el formulario de reservas y en la página pública, entre “Ninguna” y “Otra…” (que deja
        escribir cualquiera). Cambiar o quitar una no toca las reservas ya guardadas.
      </p>
    </div>
  );
}

/** Cuándo empieza la semana de pago y qué día se paga. */
export function PayWeekForm({ payWeekStart, payDay }: { payWeekStart: number; payDay: number }) {
  return (
    <GroupForm group="semana-de-pago" resetKey={`${payWeekStart}|${payDay}`}>
      <div className="grid gap-2">
        <Label htmlFor="payWeekStart">La semana de pago empieza el</Label>
        <select id="payWeekStart" name="payWeekStart" defaultValue={payWeekStart} className={SELECT_CLASS}>
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Define la “Semana” en Pagos, Reportes, Hoy y Empleados.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payDay">La semana se paga el</Label>
        <select id="payDay" name="payDay" defaultValue={payDay} className={SELECT_CLASS}>
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
    </GroupForm>
  );
}

/** Horario de atención por día (informativo). Vacío = sin horario. */
export function OpeningHoursForm({ openingHours }: { openingHours: string[] }) {
  const [hours, setHours] = useState(() =>
    Array.from({ length: 7 }, (_, i) => parseHours(openingHours[i]) ?? { open: "", close: "" })
  );
  const set = (i: number, key: "open" | "close", value: string) =>
    setHours((h) => h.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  // "Copiar": el primer horario completo (en el orden de la tabla) pasa a los días vacíos.
  const first = HOURS_ORDER.map((i) => hours[i]).find((h) => h.open && h.close);
  const hasEmpty = hours.some((h) => !h.open && !h.close);
  const fillEmpty = () => first && setHours((h) => h.map((row) => (!row.open && !row.close ? first : row)));

  return (
    <GroupForm group="horario" resetKey="horario">
      <fieldset className="grid gap-2">
        <legend className="sr-only">Horario de atención</legend>
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
    </GroupForm>
  );
}

/** Días con doble turno y horario de cada turno (propinas por turno, pago por turno). */
export function DoubleShiftForm({ weekdays, shiftHours }: { weekdays: number[]; shiftHours: string[] }) {
  const shifts = [0, 1].map((i) => parseHours(shiftHours[i]) ?? { open: "", close: "" });
  return (
    <GroupForm group="turnos" resetKey={`${weekdays.join()}|${shiftHours.join()}`}>
      <fieldset className="grid gap-3">
        <legend className="sr-only">Doble turno</legend>
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
    </GroupForm>
  );
}
