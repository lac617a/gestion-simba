"use client";

import { useTransition } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";
import { setDoubleShift } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";

type Props = {
  date: string;
  doubleShift: boolean;
  /** ["11:00 a. m. a 4:00 p. m.", "5:30 p. m. a 11:30 p. m."] */
  shiftLabels: [string, string] | null;
  /** Se puede activar/quitar: día abierto y turno de la mañana sin cerrar */
  canToggle: boolean;
};

/** Doble turno del día: horario de cada turno y, si se puede, activarlo o quitarlo a mano. */
export function ShiftBar({ date, doubleShift, shiftLabels, canToggle }: Props) {
  const [pending, startTransition] = useTransition();
  if (!doubleShift && !canToggle) return null;

  function toggle() {
    startTransition(async () => {
      const res = await setDoubleShift(date, !doubleShift);
      if (res.ok) toast.success(doubleShift ? "Este día queda con un solo turno" : "Este día queda con doble turno");
      else toast.error(res.error);
    });
  }

  if (!doubleShift) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
          <SunIcon /> Usar doble turno este día
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-sm text-sky-950">
      <span className="font-medium">Doble turno</span>
      {shiftLabels && (
        <>
          <span className="flex items-center gap-1.5">
            <SunIcon className="size-4 shrink-0" /> Mañana {shiftLabels[0]}
          </span>
          <span className="flex items-center gap-1.5">
            <MoonIcon className="size-4 shrink-0" /> Tarde {shiftLabels[1]}
          </span>
        </>
      )}
      {canToggle && (
        <Button variant="ghost" size="sm" className="ml-auto" disabled={pending} onClick={toggle}>
          Quitar doble turno
        </Button>
      )}
    </div>
  );
}
