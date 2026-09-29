"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveProductionPay } from "@/app/actions/production";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Currency } from "@/lib/money";

/** Pago fijo por asistir a una jornada de producción. */
export function ProductionPayForm({ amount, currency }: { amount: number; currency: Currency }) {
  const [state, action, pending] = useActionState(saveProductionPay, undefined);
  const [value, setValue] = useState<number | null>(amount);
  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="grid gap-2 border-t pt-4">
      <Label htmlFor="productionPay">Producción: pago por asistir</Label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <MoneyInput id="productionPay" name="productionPay" currency={currency} value={value} onValueChange={setValue} required />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Fijo por cada empleado que asiste a una jornada de producción (el excedente se anota aparte). Cambiarlo no toca las
        jornadas ya registradas.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
