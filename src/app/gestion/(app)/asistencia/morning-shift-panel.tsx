"use client";

import { useActionState, useState, useTransition } from "react";
import { LockIcon, LockOpenIcon, SunIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import type { MorningCloseState } from "@/app/actions/closing";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inShift, missingShift, perPersonLabel, splitTips, type ClosingRow } from "@/lib/closing";
import { formatMoney, parseMoney, type Currency } from "@/lib/money";

type Props = {
  action: (state: MorningCloseState, formData: FormData) => Promise<MorningCloseState>;
  reopen: () => Promise<void>;
  currency: Currency;
  /** El turno de la mañana ya se cerró */
  closed: boolean;
  /** Propinas de la mañana guardadas (unidades mínimas) */
  savedTips: number | null;
  /** Asistencia con los estados y turnos actuales */
  rows: ClosingRow[];
};

/**
 * Cierre del turno de la mañana (días de doble turno, ~4 p. m.): se anotan sus
 * propinas y queda fijo quién lo hizo. El reparto final se guarda al cerrar el día.
 */
export function MorningShiftPanel({ action, reopen, currency, closed, savedTips, rows }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [reopening, startReopen] = useTransition();
  const sent = state?.values?.tipsMorning;
  const [tips, setTips] = useState<number | null>(sent ? parseMoney(sent, currency.decimals) : savedTips);

  const workers = rows.filter((r) => inShift(r, "MORNING"));
  const shares = splitTips(tips ?? 0, workers);
  const missing = missingShift(rows);
  const noWorkers = (tips ?? 0) > 0 && workers.length === 0;

  if (closed) {
    const saved = splitTips(savedTips ?? 0, workers);
    return (
      <section className="grid gap-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <LockIcon className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Turno de la mañana cerrado</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Propinas de la mañana: <span className="font-medium text-foreground">{formatMoney(savedTips ?? 0, currency)}</span>
          {saved.length > 0 && (
            <>
              {" "}
              entre {saved.length} {saved.length === 1 ? "persona" : "personas"} ({saved.map((s) => s.name).join(", ")})
            </>
          )}
          .
        </p>
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={reopening}
          onClick={() =>
            startReopen(async () => {
              await reopen();
              toast.success("Turno de la mañana reabierto");
            })
          }
        >
          <LockOpenIcon /> Reabrir turno de la mañana
        </Button>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <SunIcon className="size-4" /> Cierre del turno de la mañana
        </h2>
        <p className="text-sm text-muted-foreground">
          Al terminar la mañana anota sus propinas. Se reparten en partes iguales entre quienes hicieron la mañana
          (Mañana o Ambos). Después ya no se puede cambiar quién la hizo.
        </p>
      </div>
      {/* key: remonta el campo con lo enviado cuando la acción devuelve un error */}
      <form key={sent ?? ""} action={formAction} className="grid gap-3">
        <div className="grid max-w-60 gap-2">
          <Label htmlFor="tipsMorning">Propinas de la mañana ({currency.code})</Label>
          <MoneyInput id="tipsMorning" name="tipsMorning" currency={currency} value={tips} onValueChange={setTips} placeholder="0" />
        </div>

        <p className="text-sm text-muted-foreground">
          {workers.length === 0 ? (
            "Nadie está marcado todavía en el turno de la mañana."
          ) : (
            <>
              Mañana: {workers.map((w) => w.name).join(", ")}
              {(tips ?? 0) > 0 && (
                <>
                  {" "}→{" "}
                  <span className="font-medium text-foreground">
                    {perPersonLabel(shares.map((s) => s.amount), currency)}
                  </span>{" "}
                  c/u
                </>
              )}
            </>
          )}
        </p>

        {missing.length > 0 && (
          <Warning>Falta indicar el turno de {missing.map((r) => r.name).join(", ")}.</Warning>
        )}
        {noWorkers && <Warning>Nadie hizo el turno de la mañana: no hay a quién repartir sus propinas.</Warning>}
        {state?.error && <Warning role="alert">{state.error}</Warning>}

        <Button type="submit" className="justify-self-start" disabled={pending || missing.length > 0 || noWorkers}>
          <LockIcon />
          {pending ? "Cerrando…" : "Cerrar turno de la mañana"}
        </Button>
      </form>
    </section>
  );
}

function Warning({ children, role }: { children: React.ReactNode; role?: string }) {
  return (
    <p role={role} className="flex items-start gap-2 text-sm text-amber-700">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
