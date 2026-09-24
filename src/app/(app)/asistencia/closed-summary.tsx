"use client";

import { useTransition } from "react";
import { LockIcon, LockOpenIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatMoney, type Currency } from "@/lib/money";
import type { DayClosing } from "@/lib/workdays";

type Props = {
  closing: DayClosing;
  currency: Currency;
  /** "10:42 p. m." en la zona del restaurante */
  closedAtLabel: string | null;
  reopenAction: () => Promise<void>;
};

export function ClosedSummary({ closing, currency, closedAtLabel, reopenAction }: Props) {
  const [pending, startTransition] = useTransition();
  const money = (v: number | null) => formatMoney(v ?? 0, currency);

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <LockIcon className="size-4 text-muted-foreground" />
        <h2 className="font-medium">Día cerrado</h2>
        {closedAtLabel && <span className="text-sm text-muted-foreground">· {closedAtLabel}</span>}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Venta total" value={money(closing.totalSales)} />
        <Stat label="Propinas" value={money(closing.tipsTotal)} />
      </dl>

      {closing.shares.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Reparto de propinas</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {closing.shares.map((s) => (
              <li key={s.employeeId} className="flex justify-between gap-2 px-3 py-2">
                <span className="truncate">{s.name}</span>
                <span className="font-medium tabular-nums">{formatMoney(s.amount, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {closing.note && <p className="text-sm text-muted-foreground italic">{closing.note}</p>}

      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="outline" className="justify-self-start" disabled={pending} />}
        >
          <LockOpenIcon />
          Reabrir día
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reabrir el día?</AlertDialogTitle>
            <AlertDialogDescription>
              Podrás corregir la asistencia, la venta y las propinas. El reparto se volverá a calcular al cerrar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  await reopenAction();
                  toast.success("Día reabierto");
                })
              }
            >
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
