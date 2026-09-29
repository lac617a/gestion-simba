"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteProductionDay } from "@/app/actions/production";
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

export function DeleteProductionButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" disabled={pending} />}>
        <Trash2Icon /> Eliminar jornada
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la jornada del {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borra con sus asistentes y deja de sumarse en Pagos. Úsalo solo si se registró por error.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => startTransition(() => deleteProductionDay(id))}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
