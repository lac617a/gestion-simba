"use client";

import { useTransition } from "react";
import { CircleCheckIcon, TriangleAlertIcon, Undo2Icon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { deletePayment, markAllPaid, markPaid, settlePaymentDifference } from "@/app/actions/payments";
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
import { formatDateRange } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { EmployeePayStatus } from "@/lib/payroll";
import type { Period } from "@/lib/periods";
import { cn } from "@/lib/utils";

type Common = { period: Period; periodLabel: string; currency: Currency; unclosedDays: number; timeZone: string };

/** Estado de pago de un empleado en el periodo, con sus acciones. */
export function EmployeePayActions({ employee: e, period, periodLabel, currency, unclosedDays, timeZone }: Common & { employee: EmployeePayStatus }) {
  const [pending, startTransition] = useTransition();
  const money = (v: number) => formatMoney(v, currency);
  const paidAtFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone });

  function pay() {
    startTransition(async () => {
      const res = await markPaid(e.employeeId, period.from, period.to, e.total);
      if (res.ok) toast.success(`Pago de ${e.name} registrado`);
      else toast.error(res.error);
    });
  }

  function settle(id: string, current: number) {
    startTransition(async () => {
      const res = await settlePaymentDifference(id, current);
      if (res.ok) toast.success("Diferencia registrada");
      else toast.error(res.error);
    });
  }

  function undo(id: string) {
    startTransition(async () => {
      const res = await deletePayment(id);
      if (res.ok) toast.success("Pago deshecho");
      else toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-2 border-t border-dashed px-4 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={e.status} />
        {e.pending > 0 && e.status !== "pending" && (
          <span className="text-muted-foreground">
            Falta {money(e.pending)}
            {e.pendingDays > 0 && ` (${e.pendingDays} ${e.pendingDays === 1 ? "día" : "días"})`}
          </span>
        )}
        {e.pending < 0 && <span className="text-muted-foreground">Pagado de más: {money(-e.pending)}</span>}
        {e.canPay && (
          <ConfirmButton
            className="ml-auto"
            disabled={pending}
            label={`Marcar pagado · ${money(e.total)}`}
            title={`¿Registrar el pago a ${e.name}?`}
            description={`${money(e.total)} por ${e.days} ${e.days === 1 ? "día" : "días"} trabajados (${periodLabel}).`}
            unclosedDays={unclosedDays}
            onConfirm={pay}
          />
        )}
      </div>

      {e.pendingDays > 0 && !e.canPay && (
        <p className="text-xs text-muted-foreground">
          Parte de este periodo ya se pagó. Para pagar lo que falta, elige solo esas fechas en “Otras fechas”.
        </p>
      )}

      {e.payments.map((p) => {
        const changed = p.currentAmount !== null && p.currentAmount !== p.amount;
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>
              Pagado el {paidAtFormat.format(new Date(p.paidAt))}: <span className="text-foreground tabular-nums">{money(p.amount)}</span>
              {(p.from !== period.from || p.to !== period.to) && ` (${formatDateRange(p.from, p.to)})`}
            </span>
            {changed && (
              <span className="flex items-center gap-1 text-amber-700">
                <TriangleAlertIcon className="size-3.5" />
                Hoy esos días suman {money(p.currentAmount!)} (diferencia {money(p.currentAmount! - p.amount)})
              </span>
            )}
            <span className="ml-auto flex gap-1">
              {changed && (
                <Button variant="outline" size="xs" disabled={pending} onClick={() => settle(p.id, p.currentAmount!)}>
                  Registrar diferencia
                </Button>
              )}
              <Button variant="ghost" size="xs" disabled={pending} onClick={() => undo(p.id)}>
                <Undo2Icon /> Deshacer
              </Button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Pagar de una vez a todos los que no tienen pago en el periodo. */
export function MarkAllPaidButton({
  count,
  amount,
  period,
  periodLabel,
  currency,
  unclosedDays,
}: Common & { count: number; amount: number }) {
  const [pending, startTransition] = useTransition();
  if (count === 0) return null;
  const money = formatMoney(amount, currency);

  return (
    <ConfirmButton
      disabled={pending}
      label={`Marcar todos como pagados · ${money}`}
      title={`¿Registrar el pago a ${count} ${count === 1 ? "empleado" : "empleados"}?`}
      description={`${money} en total (${periodLabel}).`}
      unclosedDays={unclosedDays}
      onConfirm={() =>
        startTransition(async () => {
          const res = await markAllPaid(period.from, period.to, amount);
          if (res.ok) toast.success(`${res.count} ${res.count === 1 ? "pago registrado" : "pagos registrados"}`);
          else toast.error(res.error);
        })
      }
    />
  );
}

function StatusBadge({ status }: { status: EmployeePayStatus["status"] }) {
  const map = {
    paid: { label: "Pagado", className: "bg-emerald-100 text-emerald-800", icon: <CircleCheckIcon className="size-3.5" /> },
    partial: { label: "Pagado en parte", className: "bg-amber-100 text-amber-800", icon: null },
    pending: { label: "Pendiente", className: "bg-muted text-muted-foreground", icon: null },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", map.className)}>
      {map.icon}
      {map.label}
    </span>
  );
}

function ConfirmButton({
  label,
  title,
  description,
  unclosedDays,
  onConfirm,
  disabled,
  className,
}: {
  label: string;
  title: string;
  description: string;
  unclosedDays: number;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" className={className} disabled={disabled} />}>
        <WalletIcon /> {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {unclosedDays > 0 &&
              ` Ojo: ${unclosedDays} ${unclosedDays === 1 ? "día del periodo no está cerrado" : "días del periodo no están cerrados"} y no se incluyen.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sí, registrar pago</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
