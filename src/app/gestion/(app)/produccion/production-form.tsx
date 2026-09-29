"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ProductionFormState, ProductionFormValues } from "@/app/actions/production";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, parseMoney, type Currency } from "@/lib/money";
import { extraField } from "@/lib/production";
import { cn } from "@/lib/utils";

type Candidate = { id: string; name: string; position: string | null };

type Props = {
  action: (state: ProductionFormState, formData: FormData) => Promise<ProductionFormState>;
  currency: Currency;
  candidates: Candidate[];
  /** Pago fijo actual (Configuración), para quienes se agreguen */
  productionPay: number;
  /** Pago fijo guardado de quienes ya estaban en la jornada (al editar) */
  savedBasePay: Record<string, number>;
  defaults: { date: string; note: string; attendees: Record<string, number> };
  submitLabel: string;
};

export function ProductionForm({ action, currency, candidates, productionPay, savedBasePay, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const sent = state?.values;
  // key: tras un error se remonta con lo enviado (React vacía el form tras la acción)
  return (
    <Fields
      key={JSON.stringify(sent ?? null)}
      formAction={formAction}
      pending={pending}
      state={state}
      currency={currency}
      candidates={candidates}
      productionPay={productionPay}
      savedBasePay={savedBasePay}
      initial={sent ? fromSent(sent, currency) : defaults}
      submitLabel={submitLabel}
    />
  );
}

function fromSent(sent: ProductionFormValues, currency: Currency) {
  return {
    date: sent.date,
    note: sent.note,
    attendees: Object.fromEntries(
      sent.employeeIds.map((id) => [id, parseMoney(sent.extras[id] ?? "", currency.decimals) ?? 0])
    ),
  };
}

function Fields({
  formAction,
  pending,
  state,
  currency,
  candidates,
  productionPay,
  savedBasePay,
  initial,
  submitLabel,
}: Omit<Props, "action" | "defaults"> & {
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: ProductionFormState;
  initial: Props["defaults"];
}) {
  // Asistentes marcados → excedente (null = vacío)
  const [selected, setSelected] = useState<Record<string, number | null>>(
    Object.fromEntries(Object.entries(initial.attendees).map(([id, extra]) => [id, extra || null]))
  );
  const money = (v: number) => formatMoney(v, currency);
  const baseOf = (id: string) => savedBasePay[id] ?? productionPay;
  const ids = Object.keys(selected);
  const total = ids.reduce((s, id) => s + baseOf(id) + (selected[id] ?? 0), 0);

  function toggle(id: string, on: boolean) {
    setSelected((s) => {
      const next = { ...s };
      if (on) next[id] = null;
      else delete next[id];
      return next;
    });
  }

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
        <div className="grid content-start gap-2">
          <Label htmlFor="date">Fecha *</Label>
          <Input id="date" name="date" type="date" defaultValue={initial.date} required />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="note">Nota</Label>
          <Input id="note" name="note" maxLength={200} defaultValue={initial.note} placeholder="Ej. salsas, carnes para la semana…" />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">¿Quién asistió?</legend>
        <p className="text-xs text-muted-foreground">
          Cada asistente cobra {money(productionPay)} fijos más el excedente que se le anote. Se suma a su pago de la semana.
        </p>
        <ul className="divide-y rounded-lg border">
          {candidates.map((c) => {
            const on = c.id in selected;
            const extra = selected[c.id] ?? null;
            const error = state?.extraErrors?.[c.id];
            return (
              <li key={c.id} className={cn("grid gap-2 px-3 py-2.5 sm:grid-cols-[1fr_9rem_7rem] sm:items-center sm:gap-4", on && "bg-muted/40")}>
                <label className="flex min-w-0 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="employeeId"
                    value={c.id}
                    checked={on}
                    onChange={(e) => toggle(c.id, e.target.checked)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    {c.position && <span className="text-xs text-muted-foreground">{c.position}</span>}
                  </span>
                </label>
                {on && (
                  <>
                    <div className="grid gap-1">
                      <MoneyInput
                        id={extraField(c.id)}
                        name={extraField(c.id)}
                        currency={currency}
                        value={extra}
                        onValueChange={(v) => setSelected((s) => ({ ...s, [c.id]: v }))}
                        placeholder="Excedente"
                        aria-label={`Excedente de ${c.name}`}
                        invalid={!!error}
                      />
                      {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
                      {money(baseOf(c.id))}
                      {extra ? ` + ${money(extra)}` : ""} ={" "}
                      <span className="font-semibold text-foreground">{money(baseOf(c.id) + (extra ?? 0))}</span>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-sm">
          {ids.length} {ids.length === 1 ? "asistente" : "asistentes"} · Total{" "}
          <span className="font-semibold tabular-nums">{money(total)}</span>
        </p>
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/gestion/produccion" />} nativeButton={false}>
          Volver
        </Button>
      </div>
    </form>
  );
}
