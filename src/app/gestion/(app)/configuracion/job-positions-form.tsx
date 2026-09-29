"use client";

import { useActionState, useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { saveJobPositions } from "@/app/actions/job-positions";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobPosition } from "@/lib/job-positions-data";
import type { Currency } from "@/lib/money";

type Row = { key: string; id: string; name: string; dailyPay: number | null; employees: number };

const toRows = (positions: JobPosition[]): Row[] => positions.map((p) => ({ key: p.id, ...p }));

/** Puestos y su pago diario: agregar, renombrar, cambiar el pago y quitar los que nadie usa. */
export function JobPositionsForm({ positions, currency }: { positions: JobPosition[]; currency: Currency }) {
  const [state, action, pending] = useActionState(saveJobPositions, undefined);
  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  // key: tras guardar se remonta con la lista que llega del servidor
  return (
    <Rows key={JSON.stringify(positions)} initial={toRows(positions)} currency={currency} action={action} pending={pending} error={state?.error} />
  );
}

function Rows({
  initial,
  currency,
  action,
  pending,
  error,
}: {
  initial: Row[];
  currency: Currency;
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  const [rows, setRows] = useState(initial);
  const set = (key: string, patch: Partial<Row>) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const add = () =>
    setRows((r) => [...r, { key: `nuevo-${Date.now()}`, id: "", name: "", dailyPay: null, employees: 0 }]);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid grid-cols-[1fr_8.5rem_auto] items-center gap-x-2 gap-y-2 text-sm">
        <span className="text-xs text-muted-foreground">Puesto</span>
        <span className="text-xs text-muted-foreground">Pago diario</span>
        <span />
        {rows.map((r, i) => (
          <div key={r.key} className="contents">
            <input type="hidden" name="positionId" value={r.id} />
            <Input
              name="positionName"
              value={r.name}
              onChange={(e) => set(r.key, { name: e.target.value })}
              placeholder="Ej. Auxiliar de cocina"
              aria-label={`Puesto ${i + 1}: nombre`}
              maxLength={40}
              autoFocus={!r.id && i === rows.length - 1 && rows.length > initial.length}
              required
            />
            <MoneyInput
              id={`pay-${r.key}`}
              name="positionPay"
              currency={currency}
              value={r.dailyPay}
              onValueChange={(v) => set(r.key, { dailyPay: v })}
              placeholder="0"
              aria-label={`Puesto ${i + 1}: pago diario`}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar ${r.name || "puesto"}`}
              title={
                r.employees > 0
                  ? `Lo ${r.employees === 1 ? "tiene 1 empleado" : `tienen ${r.employees} empleados`}: cámbiales el puesto para poder quitarlo`
                  : "Quitar puesto"
              }
              disabled={r.employees > 0 || rows.length === 1}
              onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={add}>
        <PlusIcon /> Agregar puesto
      </Button>

      <p className="text-xs text-muted-foreground">
        Al cerrar el día, el pago de cada empleado se llena con el de su puesto (se puede ajustar ese día si hace falta).
        Cambiar un pago no modifica los días ya cerrados. Un puesto que tiene empleados no se puede quitar.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="justify-self-start" disabled={pending}>
        {pending ? "Guardando…" : "Guardar puestos"}
      </Button>
    </form>
  );
}
