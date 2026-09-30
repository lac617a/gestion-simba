"use client";

import { useActionState, useState } from "react";
import { LockIcon, TriangleAlertIcon } from "lucide-react";
import type { CloseDayState } from "@/app/actions/closing";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  inShift,
  missingShift,
  payFor,
  perPersonLabel,
  SHIFT_LABEL,
  splitShiftTips,
  splitTips,
  type ClosingRow,
  type PayRow,
} from "@/lib/closing";
import { formatMoney, parseMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DayClosing } from "@/lib/workdays";

/** Fila del cierre: el pago del día se calcula (tarifa del puesto × turnos), no se escribe. */
export type CloseDayRow = PayRow;

type Props = {
  action: (state: CloseDayState, formData: FormData) => Promise<CloseDayState>;
  currency: Currency;
  /** Asistencia con los estados y turnos actuales (incluye cambios aún no confirmados) */
  rows: CloseDayRow[];
  saved: DayClosing | null;
  /** Día de doble turno: propinas por turno y pago por turno */
  doubleShift: boolean;
  /** Las propinas de la mañana ya se anotaron al cerrar ese turno */
  morningClosed: boolean;
};

/** Montos iniciales del formulario, en unidades mínimas (null = vacío). */
type Initial = {
  totalSales: number | null;
  expensesTotal: number | null;
  tipsTotal: number | null;
  tipsMorning: number | null;
  tipsEvening: number | null;
  note: string;
};

export function CloseDayPanel({ action, currency, rows, saved, doubleShift, morningClosed }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Tras un error se muestra lo enviado; si no, lo guardado.
  const sent = state?.values;
  const parse = (v: string | undefined) => (v ? parseMoney(v, currency.decimals) : null);
  const initial: Initial = sent
    ? {
        totalSales: parse(sent.totalSales),
        expensesTotal: parse(sent.expensesTotal),
        tipsTotal: parse(sent.tipsTotal),
        tipsMorning: parse(sent.tipsMorning),
        tipsEvening: parse(sent.tipsEvening),
        note: sent.note,
      }
    : {
        totalSales: saved?.totalSales ?? null,
        expensesTotal: saved?.expensesTotal ?? null,
        tipsTotal: saved?.tipsTotal ?? null,
        tipsMorning: saved?.tipsMorning ?? null,
        tipsEvening: saved?.tipsEvening ?? null,
        note: saved?.note ?? "",
      };

  return (
    <section id="cierre" className="grid scroll-mt-20 gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">{doubleShift ? "Cierre del día (turno de la tarde)" : "Cierre del día"}</h2>
        <p className="text-sm text-muted-foreground">
          {doubleShift
            ? "Al final de la noche: venta y gastos totales del día y propinas de la tarde. Las propinas de cada turno se reparten entre quienes lo hicieron; el pago es la tarifa del puesto por cada turno."
            : "Anota la venta, los gastos y las propinas del día. Las propinas se reparten en partes iguales entre quienes trabajaron; el pago es la tarifa del puesto."}
        </p>
      </div>
      {/* key: remonta los campos con lo enviado cuando la acción devuelve un error */}
      <form key={JSON.stringify(sent ?? null)} action={formAction} className="grid gap-4">
        <CloseDayFields
          initial={initial}
          currency={currency}
          rows={rows}
          state={state}
          pending={pending}
          doubleShift={doubleShift}
          morningClosed={morningClosed}
          savedMorning={saved?.tipsMorning ?? 0}
        />
      </form>
    </section>
  );
}

function CloseDayFields({
  initial,
  currency,
  rows,
  state,
  pending,
  doubleShift,
  morningClosed,
  savedMorning,
}: {
  initial: Initial;
  currency: Currency;
  rows: CloseDayRow[];
  state: CloseDayState;
  pending: boolean;
  doubleShift: boolean;
  morningClosed: boolean;
  savedMorning: number;
}) {
  const [sales, setSales] = useState(initial.totalSales);
  const [expenses, setExpenses] = useState(initial.expensesTotal);
  const [tips, setTips] = useState(initial.tipsTotal);
  const [morning, setMorning] = useState(initial.tipsMorning);
  const [evening, setEvening] = useState(initial.tipsEvening);

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const workers = rows.filter((r) => r.status === "WORKED");

  const morningTips = doubleShift ? (morningClosed ? savedMorning : (morning ?? 0)) : 0;
  const eveningTips = doubleShift ? (evening ?? 0) : 0;
  const shares = doubleShift ? splitShiftTips(morningTips, eveningTips, rows) : splitTips(tips ?? 0, rows);
  const tipOf = new Map(shares.map((s) => [s.employeeId, s.amount]));

  const missing = doubleShift ? missingShift(rows) : [];
  const emptyShift = doubleShift
    ? (["MORNING", "EVENING"] as const).find(
        (s) => (s === "MORNING" ? morningTips : eveningTips) > 0 && !rows.some((r) => inShift(r, s))
      )
    : undefined;
  const noWorkers = !doubleShift && (tips ?? 0) > 0 && workers.length === 0;

  const noPosition = workers.filter((r) => payFor(r, doubleShift) === null);

  return (
    <>
      <div className={doubleShift ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-3"}>
        <MoneyField
          id="totalSales"
          label={`Venta total del día (${currency.code})`}
          currency={currency}
          value={sales}
          onValueChange={setSales}
          error={state?.errors?.totalSales}
          required
        />
        <MoneyField
          id="expensesTotal"
          label="Gastos del día"
          currency={currency}
          value={expenses}
          onValueChange={setExpenses}
          error={state?.errors?.expensesTotal}
          hint="Compras, insumos, servicios… 0 si no hubo."
          required
        />
        {doubleShift ? (
          <>
            {morningClosed ? (
              <div className="grid content-start gap-2">
                <span className="text-sm font-medium">Propinas de la mañana</span>
                <p className="flex h-8 items-center gap-1.5 text-sm tabular-nums">
                  <LockIcon className="size-3.5 text-muted-foreground" /> {formatMoney(savedMorning, currency)}
                </p>
              </div>
            ) : (
              <MoneyField
                id="tipsMorning"
                label="Propinas de la mañana"
                currency={currency}
                value={morning}
                onValueChange={setMorning}
                error={state?.errors?.tipsMorning}
                placeholder="0"
              />
            )}
            <MoneyField
              id="tipsEvening"
              label="Propinas de la tarde"
              currency={currency}
              value={evening}
              onValueChange={setEvening}
              error={state?.errors?.tipsEvening}
              placeholder="0"
            />
          </>
        ) : (
          <MoneyField
            id="tipsTotal"
            label={`Propinas (${currency.code})`}
            currency={currency}
            value={tips}
            onValueChange={setTips}
            error={state?.errors?.tipsTotal}
            placeholder="0"
          />
        )}
      </div>
      {sales !== null && expenses !== null && (
        <p className="-mt-1 text-sm text-muted-foreground">
          Venta − gastos:{" "}
          <span className={cn("font-medium tabular-nums", sales - expenses < 0 ? "text-destructive" : "text-foreground")}>
            {formatMoney(sales - expenses, currency)}
          </span>
        </p>
      )}

      {workers.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Pago del día</legend>
          {doubleShift ? (
            <ShiftTipLines rows={rows} morning={morningTips} evening={eveningTips} currency={currency} />
          ) : (
            (tips ?? 0) > 0 && <TipLine shares={shares} total={tips ?? 0} currency={currency} />
          )}
          <ul className="divide-y rounded-lg border">
            {workers.map((w) => {
              const pay = payFor(w, doubleShift);
              const tip = tipOf.get(w.employeeId) ?? 0;
              return (
                <li key={w.employeeId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{w.name}</span>
                    {doubleShift && (
                      <span className="text-xs text-muted-foreground">
                        {w.shift ? `${SHIFT_LABEL[w.shift]}${w.shift === "BOTH" ? " (2 turnos)" : ""}` : "Sin turno"}
                      </span>
                    )}
                  </span>
                  {pay === null ? (
                    <Link
                      href="/gestion/empleados"
                      className="text-sm font-medium text-amber-700 underline underline-offset-4"
                    >
                      Sin puesto: asígnalo
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatMoney(pay, currency)} + propina {formatMoney(tip, currency)} ={" "}
                      <span className="font-semibold text-foreground">{formatMoney(pay + tip, currency)}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            El pago es la tarifa del puesto{doubleShift ? " por cada turno" : ""} (Configuración → Puestos y pago diario).
          </p>
        </fieldset>
      )}

      <div className="grid gap-2">
        <Label htmlFor="note">Nota del día</Label>
        <Input id="note" name="note" maxLength={300} defaultValue={initial.note} placeholder="Opcional" />
      </div>

      {pendingCount > 0 && (
        <Warning>
          Falta marcar la asistencia de {pendingCount} empleado{pendingCount === 1 ? "" : "s"}.
        </Warning>
      )}
      {missing.length > 0 && <Warning>Falta indicar el turno de {missing.map((r) => r.name).join(", ")}.</Warning>}
      {emptyShift && (
        <Warning>
          Nadie hizo el turno de la {emptyShift === "MORNING" ? "mañana" : "tarde"}: no hay a quién repartir sus propinas.
        </Warning>
      )}
      {noWorkers && <Warning>Nadie está marcado como “Trabajó”: no hay a quién repartir las propinas.</Warning>}
      {noPosition.length > 0 && (
        <Warning>
          Falta el puesto de {noPosition.map((r) => r.name).join(", ")}: asígnalo en Empleados para calcular su pago.
        </Warning>
      )}
      {state?.message && <Warning role="alert">{state.message}</Warning>}

      <Button
        type="submit"
        size="lg"
        className="justify-self-start"
        disabled={pending || pendingCount > 0 || noWorkers || missing.length > 0 || !!emptyShift || noPosition.length > 0}
      >
        <LockIcon />
        {pending ? "Cerrando…" : "Cerrar día"}
      </Button>
    </>
  );
}

function MoneyField({
  id,
  label,
  hideLabel,
  error,
  hint,
  ...props
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  /** Ayuda corta debajo del campo */
  hint?: string;
  currency: Currency;
  value: number | null;
  onValueChange: (minor: number | null) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <MoneyInput id={id} name={id} invalid={!!error} {...props} />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function TipLine({ shares, total, currency }: { shares: { amount: number }[]; total: number; currency: Currency }) {
  if (shares.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Propinas: {formatMoney(total, currency)} entre {shares.length} {shares.length === 1 ? "persona" : "personas"} →{" "}
      <span className="font-medium text-foreground">{perPersonLabel(shares.map((s) => s.amount), currency)}</span> c/u
    </p>
  );
}

/** Una línea por turno con su reparto. */
function ShiftTipLines({
  rows,
  morning,
  evening,
  currency,
}: {
  rows: ClosingRow[];
  morning: number;
  evening: number;
  currency: Currency;
}) {
  const lines = (
    [
      ["Mañana", morning, rows.filter((r) => inShift(r, "MORNING"))],
      ["Tarde", evening, rows.filter((r) => inShift(r, "EVENING"))],
    ] as const
  ).filter(([, total, people]) => total > 0 && people.length > 0);
  if (lines.length === 0) return null;
  return (
    <div className="grid gap-0.5 text-sm text-muted-foreground">
      {lines.map(([label, total, people]) => (
        <p key={label}>
          Propinas {label.toLowerCase()}: {formatMoney(total, currency)} entre {people.length}{" "}
          {people.length === 1 ? "persona" : "personas"} →{" "}
          <span className="font-medium text-foreground">
            {perPersonLabel(splitTips(total, [...people]).map((s) => s.amount), currency)}
          </span>{" "}
          c/u
        </p>
      ))}
    </div>
  );
}

function Warning({ children, role }: { children: React.ReactNode; role?: string }) {
  return (
    <p role={role} className="flex items-start gap-2 text-sm text-amber-700">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
