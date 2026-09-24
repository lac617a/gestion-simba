"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setEmployeeActive } from "@/app/actions/employees";
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

export function ActiveToggle({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setEmployeeActive(id, !active);
      toast.success(active ? `${name} dado de baja` : `${name} reactivado`);
    });
  }

  if (!active) {
    return (
      <Button variant="outline" className="justify-self-start" onClick={toggle} disabled={pending}>
        Reactivar empleado
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" className="justify-self-start" disabled={pending} />}>
        Dar de baja
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Dar de baja a {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            No aparecerá en la asistencia diaria. Podrás reactivarlo cuando quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={toggle}>
            Dar de baja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
