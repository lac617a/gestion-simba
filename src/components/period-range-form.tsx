"use client";

import { useState, useTransition } from "react";
import { useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Period } from "@/lib/periods";
import { periodParams } from "@/lib/search-params";

/** Rango libre de fechas: cambia ?desde&hasta y conserva los demás parámetros de la dirección. */
export function PeriodRangeForm({ period }: { period: Period }) {
  const [, setPeriod] = useQueryStates(periodParams, { shallow: false, history: "push" });
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const desde = periodParams.desde.parse(from);
        const hasta = periodParams.hasta.parse(to);
        if (desde && hasta) void setPeriod({ desde, hasta }, { startTransition });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="desde">Desde</Label>
        <Input id="desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required className="w-auto" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="hasta">Hasta</Label>
        <Input id="hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} required className="w-auto" />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Cargando…" : "Ver"}
      </Button>
    </form>
  );
}
