"use client";

import { useTransition } from "react";
import { ClockIcon, DoorClosedIcon, DoorOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { setDayClosed } from "@/app/actions/schedule";
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
import type { DaySchedule } from "@/lib/schedule";
import type { DayView } from "@/lib/workdays";

type Props = {
  date: string;
  mode: DayView["mode"];
  schedule: DaySchedule;
  /** Horario de atención ya formateado ("12:00 p. m. a 10:00 p. m."), si hay */
  hours?: string | null;
};

/** Horario del día; permite cerrar un día puntual (o volver a abrirlo). */
export function ScheduleBar({ date, mode, schedule, hours }: Props) {
  const [pending, startTransition] = useTransition();
  const hasAttendance = mode === "open";

  function apply(closed: boolean, success: string) {
    startTransition(async () => {
      const res = await setDayClosed(date, closed);
      if (res.ok) toast.success(success);
      else toast.error(res.error);
    });
  }

  // Día marcado como cerrado a mano.
  if (!schedule.open) {
    return (
      <section className="grid gap-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center gap-2 font-medium">
          <DoorClosedIcon className="size-5" /> Restaurante cerrado
        </div>
        <p className="text-sm text-muted-foreground">
          Este día se marcó como cerrado. No hay asistencia ni cierre que registrar.
        </p>
        <Button variant="outline" className="justify-self-start" disabled={pending} onClick={() => apply(false, "Día abierto")}>
          <DoorOpenIcon /> Abrir este día
        </Button>
      </section>
    );
  }

  const canClose = mode === "open" || mode === "future";
  if (!canClose && !hours) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {hours && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ClockIcon className="size-4 shrink-0" />
          Abre de {hours}
        </span>
      )}
      {canClose && (
        <span className="ml-auto flex gap-2">
          <CloseDayButton
            pending={pending}
            hasAttendance={hasAttendance}
            onConfirm={() => apply(true, "Día marcado como cerrado")}
          />
        </span>
      )}
    </div>
  );
}

function CloseDayButton({
  pending,
  hasAttendance,
  onConfirm,
}: {
  pending: boolean;
  hasAttendance: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={pending} />}>
        <DoorClosedIcon /> Marcar como día cerrado
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿El restaurante no abre este día?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasAttendance
              ? "Se borrará la asistencia que ya se marcó este día. Podrás volver a abrirlo cuando quieras."
              : "No habrá asistencia ni cierre este día. Podrás volver a abrirlo cuando quieras."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Sí, está cerrado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
