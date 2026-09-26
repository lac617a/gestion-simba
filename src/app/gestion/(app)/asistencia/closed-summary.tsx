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
import type { DayClosing, DayRow } from "@/lib/workdays";

type Props = {
  closing: DayClosing;
  rows: DayRow[];
  currency: Currency;
  /** "10:42 p. m." en la zona del restaurante */
  closedAtLabel: string | null;
  reopenAction: () => Promise<void>;
};

export function ClosedSummary({ closing, rows, currency, closedAtLabel, reopenAction }: Props) {
  const [pending, startTransition] = useTransition();
  const money = (v: number | null) => formatMoney(v ?? 0, currency);
  const tipOf = new Map(closing.shares.map((s) => [s.employeeId, s.amount]));
  const payouts = rows
    .filter((r) => r.status === "WORKED")
    .map((r) => ({ employeeId: r.employeeId, name: r.name, pay: r.dailyPay, tip: tipOf.get(r.employeeId) ?? 0 }));

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

      {payouts.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Pagos del día</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">Empleado</th>
                  <th className="px-3 py-2 text-right font-normal">Pago</th>
                  <th className="px-3 py-2 text-right font-normal">Propina</th>
                  <th className="px-3 py-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {payouts.map((p) => (
                  <tr key={p.employeeId}>
                    <td className="max-w-40 truncate px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right">{p.pay === null ? "—" : money(p.pay)}</td>
                    <td className="px-3 py-2 text-right">{money(p.tip)}</td>
                    <td className="px-3 py-2 text-right font-medium">{money((p.pay ?? 0) + p.tip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
