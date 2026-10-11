"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setHolidayWeek } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

/** Interruptor de un lunes festivo: encendido = la semana termina ese lunes y se paga el martes. */
export function HolidayWeekSwitch({ date, label, extend }: { date: string; label: string; extend: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setHolidayWeek(date, !extend);
      if (!result.ok) toast.error(result.error);
      else toast.success(extend ? `${label}: semana normal` : `${label}: la semana termina ese lunes`);
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={extend}
      aria-label={`Alargar la semana de pago por el festivo del ${label}`}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        extend ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "block size-5 rounded-full bg-background shadow-sm transition-transform",
          extend ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
