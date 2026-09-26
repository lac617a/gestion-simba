"use client";

import { useTransition } from "react";
import { CalendarHeartIcon, ClockIcon, DoorClosedIcon, DoorOpenIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { setDayOverride } from "@/app/actions/schedule";
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
import { scheduleLabel, type DaySchedule } from "@/lib/schedule";
import type { DayView } from "@/lib/workdays";

type Props = {
  date: string;
  mode: DayView["mode"];
  schedule: DaySchedule;
  /** Horario de atención ya formateado ("12:00 p. m. a 10:00 p. m."), si hay */
  hours?: string | null;
};

/** Estado del día según la regla de cierre / festivos, con las excepciones manuales. */
export function ScheduleBar({ date, mode, schedule, hours }: Props) {
  const [pending, startTransition] = useTransition();
  const label = scheduleLabel(schedule);
  const hasAttendance = mode === "open";

  function apply(open: boolean | null, success: string) {
    startTransition(async () => {
      const res = await setDayOverride(date, open);
      if (res.ok) toast.success(success);
      else toast.error(res.error);
    });
  }

  // Restaurante cerrado y nada registrado.
  if (mode === "dayoff") {
    return (
      <section className="grid gap-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center gap-2 font-medium">
          <DoorClosedIcon className="size-5" /> Restaurante cerrado
        </div>
        <p className="text-sm text-muted-foreground">{label} No hay asistencia ni cierre que registrar.</p>
        {schedule.reason === "override-closed" ? (
          <Button variant="outline" className="justify-self-start" disabled={pending} onClick={() => apply(null, "Excepción quitada")}>
            Quitar excepción
          </Button>
        ) : (
          <Button variant="outline" className="justify-self-start" disabled={pending} onClick={() => apply(true, "Día abierto")}>
            <DoorOpenIcon /> Abrir este día igual
          </Button>
        )}
      </section>
    );
  }

  // Hay algo registrado en un día que normalmente no abre (antes de la regla, o sin excepción).
  if (!schedule.open) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        <TriangleAlertIcon className="size-4 shrink-0" />
        <span className="flex-1">Normalmente el restaurante no abre este día. {label}</span>
        {mode === "open" && (
          <CloseDayButton pending={pending} hasAttendance onConfirm={() => apply(false, "Día marcado como cerrado")} />
        )}
      </div>
    );
  }

  const canClose = mode === "open" || mode === "future";
  if (!label && !canClose && !hours) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {hours && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ClockIcon className="size-4 shrink-0" />
          Abre de {hours}
        </span>
      )}
      {label && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarHeartIcon className="size-4 shrink-0" />
          {label}
        </span>
      )}
      <span className="ml-auto flex gap-2">
        {schedule.reason === "override-open" && mode !== "closed" ? (
          <CloseDayButton
            pending={pending}
            hasAttendance={hasAttendance}
            label="Quitar excepción"
            onConfirm={() => apply(null, "Excepción quitada")}
          />
        ) : (
          canClose && (
            <CloseDayButton
              pending={pending}
              hasAttendance={hasAttendance}
              onConfirm={() => apply(false, "Día marcado como cerrado")}
            />
          )
        )}
      </span>
    </div>
  );
}

function CloseDayButton({
  pending,
  hasAttendance,
  onConfirm,
  label = "Marcar como día cerrado",
}: {
  pending: boolean;
  hasAttendance: boolean;
  onConfirm: () => void;
  label?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={pending} />}>
        <DoorClosedIcon /> {label}
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
