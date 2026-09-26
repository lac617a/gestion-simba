"use client";

import { useActionState, useState } from "react";
import { LockIcon, TriangleAlertIcon } from "lucide-react";
import type { CloseDayState } from "@/app/actions/closing";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { payField, splitTips, type ClosingRow } from "@/lib/closing";
import { formatMoney, parseMoney, type Currency } from "@/lib/money";
import type { DayClosing } from "@/lib/workdays";

export type CloseDayRow = ClosingRow & {
  /** Pago guardado (tras reabrir) o, si no hay, el último pago del empleado */
  defaultPay: number | null;
};

type Props = {
  action: (state: CloseDayState, formData: FormData) => Promise<CloseDayState>;
  currency: Currency;
  /** Asistencia con los estados actuales (incluye cambios aún no confirmados) */
  rows: CloseDayRow[];
  saved: DayClosing | null;
};

/** Montos iniciales del formulario, en unidades mínimas (null = vacío). */
type Initial = {
  totalSales: number | null;
  tipsTotal: number | null;
  note: string;
  pays: Record<string, number | null>;
};

export function CloseDayPanel({ action, currency, rows, saved }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Tras un error se muestra lo enviado; si no, lo guardado (o el último pago de cada uno).
  const sent = state?.values;
  const parse = (v: string | undefined) => (v ? parseMoney(v, currency.decimals) : null);
  const initial: Initial = sent
    ? {
        totalSales: parse(sent.totalSales),
        tipsTotal: parse(sent.tipsTotal),
        note: sent.note,
        pays: Object.fromEntries(rows.map((r) => [r.employeeId, parse(sent.pays[r.employeeId])])),
      }
    : {
        totalSales: saved?.totalSales ?? null,
        tipsTotal: saved?.tipsTotal ?? null,
        note: saved?.note ?? "",
        pays: Object.fromEntries(rows.map((r) => [r.employeeId, r.defaultPay])),
      };

  return (
    <section id="cierre" className="grid scroll-mt-20 gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Cierre del día</h2>
        <p className="text-sm text-muted-foreground">
          Anota la venta, las propinas y el pago del día de cada empleado. Las propinas se reparten en partes
          iguales entre quienes trabajaron.
        </p>
      </div>
      {/* key: remonta los campos con lo enviado cuando la acción devuelve un error */}
      <form key={JSON.stringify(sent ?? null)} action={formAction} className="grid gap-4">
        <CloseDayFields initial={initial} currency={currency} rows={rows} state={state} pending={pending} />
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
}: {
  initial: Initial;
  currency: Currency;
  rows: CloseDayRow[];
  state: CloseDayState;
  pending: boolean;
}) {
  const [sales, setSales] = useState(initial.totalSales);
  const [tips, setTips] = useState(initial.tipsTotal);
  const [pays, setPays] = useState(initial.pays);

  const tipsMinor = tips ?? 0;
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const shares = splitTips(tipsMinor, rows);
  const tipOf = new Map(shares.map((s) => [s.employeeId, s.amount]));
  const workers = rows.filter((r) => r.status === "WORKED");
  const noWorkers = tipsMinor > 0 && workers.length === 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
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
          id="tipsTotal"
          label={`Propinas (${currency.code})`}
          currency={currency}
          value={tips}
          onValueChange={setTips}
          error={state?.errors?.tipsTotal}
          placeholder="0"
        />
      </div>

      {workers.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Pago del día</legend>
          {tipsMinor > 0 && <TipLine shares={shares} total={tipsMinor} currency={currency} />}
          <ul className="divide-y rounded-lg border">
            {workers.map((w) => {
              const pay = pays[w.employeeId] ?? null;
              const tip = tipOf.get(w.employeeId) ?? 0;
              return (
                <li
                  key={w.employeeId}
                  className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_9rem_auto] sm:items-center sm:gap-4"
                >
                  <span className="truncate font-medium">{w.name}</span>
                  <MoneyField
                    id={payField(w.employeeId)}
                    label={`Pago del día de ${w.name}`}
                    hideLabel
                    currency={currency}
                    value={pay}
                    onValueChange={(v) => setPays((p) => ({ ...p, [w.employeeId]: v }))}
                    error={state?.errors?.pays?.[w.employeeId]}
                    placeholder="0"
                    required
                  />
                  <span className="text-sm text-muted-foreground tabular-nums sm:text-right">
                    + propina {formatMoney(tip, currency)} ={" "}
                    <span className="font-semibold text-foreground">
                      {pay === null ? "—" : formatMoney(pay + tip, currency)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
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
      {noWorkers && <Warning>Nadie está marcado como “Trabajó”: no hay a quién repartir las propinas.</Warning>}
      {state?.message && <Warning role="alert">{state.message}</Warning>}

      <Button
        type="submit"
        size="lg"
        className="justify-self-start"
        disabled={pending || pendingCount > 0 || noWorkers}
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
  ...props
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
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
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function TipLine({
  shares,
  total,
  currency,
}: {
  shares: { amount: number }[];
  total: number;
  currency: Currency;
}) {
  if (shares.length === 0) return null;
  const amounts = shares.map((s) => s.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const perPerson =
    min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  return (
    <p className="text-sm text-muted-foreground">
      Propinas: {formatMoney(total, currency)} entre {shares.length}{" "}
      {shares.length === 1 ? "persona" : "personas"} → <span className="font-medium text-foreground">{perPerson}</span>{" "}
      c/u
    </p>
  );
}

function Warning({ children, role }: { children: React.ReactNode; role?: string }) {
  return (
    <p role={role} className="flex items-start gap-2 text-sm text-amber-700">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
