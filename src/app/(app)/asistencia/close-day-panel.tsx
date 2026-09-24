"use client";

import { useActionState, useState } from "react";
import { LockIcon, TriangleAlertIcon } from "lucide-react";
import type { CloseDayState, CloseDayValues } from "@/app/actions/closing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitTips, type ClosingRow } from "@/lib/closing";
import { formatMoney, parseMoney, type Currency } from "@/lib/money";
import type { DayClosing } from "@/lib/workdays";

type Props = {
  action: (state: CloseDayState, formData: FormData) => Promise<CloseDayState>;
  currency: Currency;
  /** Asistencia con los estados actuales (incluye cambios aún no confirmados) */
  rows: ClosingRow[];
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
  };

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Cierre del día</h2>
        <p className="text-sm text-muted-foreground">
          Anota la venta y las propinas. Al cerrar, las propinas se reparten en partes iguales entre quienes trabajaron.
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
  rows: ClosingRow[];
  state: CloseDayState;
  pending: boolean;
}) {
  const [sales, setSales] = useState(initial.totalSales);
  const [tips, setTips] = useState(initial.tipsTotal);

  const tipsMinor = tips.trim() === "" ? 0 : parseMoney(tips, currency.decimals);
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const shares = tipsMinor === null ? [] : splitTips(tipsMinor, rows);
  const noWorkers = (tipsMinor ?? 0) > 0 && shares.length === 0;

  // Da formato de miles al salir del campo, si el monto es válido.
  const tidy = (value: string, set: (v: string) => void) => {
    const minor = parseMoney(value, currency.decimals);
    if (minor !== null) set(formatPlain(minor, currency));
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          id="totalSales"
          label="Venta total del día"
          value={sales}
          onChange={setSales}
          onBlur={() => tidy(sales, setSales)}
          currency={currency}
          error={state?.errors?.totalSales}
          required
        />
        <MoneyField
          id="tipsTotal"
          label="Propinas"
          value={tips}
          onChange={setTips}
          onBlur={() => tidy(tips, setTips)}
          currency={currency}
          error={state?.errors?.tipsTotal ?? (tipsMinor === null ? "Monto inválido" : undefined)}
          placeholder="0"
        />
      </div>

      <TipPreview shares={shares} total={tipsMinor ?? 0} currency={currency} />

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
  currency,
  error,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  currency: Currency;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>
        {label} ({currency.code})
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          name={id}
          inputMode={currency.decimals ? "decimal" : "numeric"}
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

function TipPreview({
  shares,
  total,
  currency,
}: {
  shares: { employeeId: string; name: string; amount: number }[];
  total: number;
  currency: Currency;
}) {
  if (total === 0 || shares.length === 0) return null;
  const amounts = shares.map((s) => s.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const perPerson =
    min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;

  return (
    <div className="grid gap-2 rounded-lg bg-muted/60 p-3 text-sm">
      <p>
        {formatMoney(total, currency)} entre {shares.length} {shares.length === 1 ? "persona" : "personas"}:{" "}
        <span className="font-semibold">{perPerson}</span> c/u
      </p>
      <ul className="grid gap-x-6 gap-y-1 text-muted-foreground sm:grid-cols-2">
        {shares.map((s) => (
          <li key={s.employeeId} className="flex justify-between gap-2">
            <span className="truncate">{s.name}</span>
            <span className="tabular-nums text-foreground">{formatMoney(s.amount, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
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
