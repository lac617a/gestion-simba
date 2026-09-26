"use client";

import { useTransition } from "react";
import { BanIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteReservation, setReservationStatus } from "@/app/actions/reservations";
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
import type { ReservationStatus } from "@/generated/prisma/enums";

/** Cancelar (queda en el historial) o eliminar (para las registradas por error). */
export function CancelOrDelete({ id, status, label }: { id: string; status: ReservationStatus; label: string }) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: ReservationStatus, message: string) {
    startTransition(async () => {
      const res = await setReservationStatus(id, next);
      if (res.ok) toast.success(message);
      else toast.error(res.error);
    });
  }

  return (
    <section className="flex flex-wrap gap-2 border-t pt-5">
      {status === "CANCELLED" ? (
        <Button variant="outline" disabled={pending} onClick={() => setStatus("CONFIRMED", "Reserva confirmada de nuevo")}>
          <Undo2Icon /> Volver a confirmar
        </Button>
      ) : (
        <Confirm
          trigger={
            <>
              <BanIcon /> Cancelar reserva
            </>
          }
          title="¿Cancelar la reserva?"
          description={`${label}. Queda en el historial como cancelada y no cuenta en los totales.`}
          action="Sí, cancelar"
          disabled={pending}
          onConfirm={() => setStatus("CANCELLED", "Reserva cancelada")}
        />
      )}
      <Confirm
        trigger={
          <>
            <Trash2Icon /> Eliminar
          </>
        }
        title="¿Eliminar la reserva?"
        description={`${label}. Se borra por completo; úsalo solo si se registró por error.`}
        action="Eliminar"
        disabled={pending}
        onConfirm={() => startTransition(() => deleteReservation(id))}
        ghost
      />
    </section>
  );
}

function Confirm({
  trigger,
  title,
  description,
  action,
  disabled,
  onConfirm,
  ghost,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: string;
  disabled: boolean;
  onConfirm: () => void;
  ghost?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant={ghost ? "ghost" : "outline"} disabled={disabled} />}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
