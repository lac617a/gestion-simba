"use client";

import { useActionState, useState } from "react";
import { LockIcon, TriangleAlertIcon } from "lucide-react";
import type { CloseDayState, CloseDayValues } from "@/app/actions/closing";
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

/** Número con separadores de miles, sin símbolo: "1.250.000" */
function formatPlain(minor: number, currency: Currency) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(minor / 10 ** currency.decimals);
}

export function CloseDayPanel({ action, currency, rows, saved }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const initial: CloseDayValues = state?.values ?? {
    totalSales: saved?.totalSales != null ? formatPlain(saved.totalSales, currency) : "",
    tipsTotal: saved?.tipsTotal != null ? formatPlain(saved.tipsTotal, currency) : "",
    note: saved?.note ?? "",
    pays: Object.fromEntries(
      rows.map((r) => [r.employeeId, r.defaultPay != null ? formatPlain(r.defaultPay, currency) : ""])
    ),
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
      <form key={JSON.stringify(state?.values ?? null)} action={formAction} className="grid gap-4">
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
  initial: CloseDayValues;
  currency: Currency;
  rows: CloseDayRow[];
  state: CloseDayState;
  pending: boolean;
}) {
  const [sales, setSales] = useState(initial.totalSales);
  const [tips, setTips] = useState(initial.tipsTotal);
  const [pays, setPays] = useState(initial.pays);

  const tipsMinor = tips.trim() === "" ? 0 : parseMoney(tips, currency.decimals);
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const shares = tipsMinor === null ? [] : splitTips(tipsMinor, rows);
  const tipOf = new Map(shares.map((s) => [s.employeeId, s.amount]));
  const workers = rows.filter((r) => r.status === "WORKED");
  const noWorkers = (tipsMinor ?? 0) > 0 && workers.length === 0;

  // Da formato de miles al salir del campo, si el monto es válido.
  const tidy = (value: string) => {
    const minor = parseMoney(value, currency.decimals);
    return minor === null ? value : formatPlain(minor, currency);
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          id="totalSales"
          decimal={currency.decimals > 0}
          label={`Venta total del día (${currency.code})`}
          value={sales}
          onChange={setSales}
          onBlur={() => setSales(tidy(sales))}
          error={state?.errors?.totalSales}
          required
        />
        <MoneyField
          id="tipsTotal"
          decimal={currency.decimals > 0}
          label={`Propinas (${currency.code})`}
          value={tips}
          onChange={setTips}
          onBlur={() => setTips(tidy(tips))}
          error={state?.errors?.tipsTotal ?? (tipsMinor === null ? "Monto inválido" : undefined)}
          placeholder="0"
        />
      </div>

      {workers.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Pago del día</legend>
          {tipsMinor !== null && tipsMinor > 0 && <TipLine shares={shares} total={tipsMinor} currency={currency} />}
          <ul className="divide-y rounded-lg border">
            {workers.map((w) => {
              const payMinor = parseMoney(pays[w.employeeId] ?? "", currency.decimals);
              const tip = tipOf.get(w.employeeId) ?? 0;
              const error = state?.errors?.pays?.[w.employeeId];
              return (
                <li key={w.employeeId} className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_9rem_auto] sm:items-center sm:gap-4">
                  <span className="truncate font-medium">{w.name}</span>
                  <MoneyField
                    id={payField(w.employeeId)}
                    label={`Pago del día de ${w.name}`}
                    hideLabel
                    decimal={currency.decimals > 0}
                    value={pays[w.employeeId] ?? ""}
                    onChange={(v) => setPays((p) => ({ ...p, [w.employeeId]: v }))}
                    onBlur={() => setPays((p) => ({ ...p, [w.employeeId]: tidy(p[w.employeeId] ?? "") }))}
                    error={error}
                    placeholder="0"
                    required
                  />
                  <span className="text-sm text-muted-foreground tabular-nums sm:text-right">
                    + propina {formatMoney(tip, currency)} ={" "}
                    <span className="font-semibold text-foreground">
                      {payMinor === null ? "—" : formatMoney(payMinor + tip, currency)}
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
        disabled={pending || pendingCount > 0 || noWorkers || tipsMinor === null}
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
  decimal,
  error,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  /** La moneda usa centavos (teclado decimal en el celular) */
  decimal?: boolean;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          name={id}
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          className="pl-6 tabular-nums"
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      </div>
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
