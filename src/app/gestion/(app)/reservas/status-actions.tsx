"use client";

import { useTransition } from "react";
import { CheckIcon, Undo2Icon, UserXIcon } from "lucide-react";
import { toast } from "sonner";
import { setReservationStatus } from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import type { ReservationStatus } from "@/generated/prisma/enums";

/** Marcar llegada / no vino (desde el día de la reserva), o volver a "Confirmada". */
export function StatusActions({ id, status, canMark }: { id: string; status: ReservationStatus; canMark: boolean }) {
  const [pending, startTransition] = useTransition();

  function set(next: ReservationStatus, message: string) {
    startTransition(async () => {
      const res = await setReservationStatus(id, next);
      if (res.ok) toast.success(message);
      else toast.error(res.error);
    });
  }

  if (status !== "CONFIRMED") {
    return (
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => set("CONFIRMED", "Reserva confirmada de nuevo")}>
        <Undo2Icon /> Deshacer
      </Button>
    );
  }
  if (!canMark) return null;
  return (
    <>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => set("ARRIVED", "Marcada como llegó")}>
        <CheckIcon /> Llegó
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => set("NO_SHOW", "Marcada como no vino")}>
        <UserXIcon /> No vino
      </Button>
    </>
  );
}
