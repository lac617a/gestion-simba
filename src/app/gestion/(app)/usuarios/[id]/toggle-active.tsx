"use client";

import { useTransition } from "react";
import { UserCheckIcon, UserXIcon } from "lucide-react";
import { toast } from "sonner";
import { setUserActive } from "@/app/actions/users";
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

/** Desactivar (no puede entrar; se conserva para el historial) o reactivar. */
export function ToggleActive({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [pending, startTransition] = useTransition();

  function run(next: boolean) {
    startTransition(async () => {
      const res = await setUserActive(id, next);
      if (res.ok) toast.success(next ? "Usuario activado" : "Usuario desactivado");
      else toast.error(res.error);
    });
  }

  if (!active) {
    return (
      <section className="grid gap-2 border-t pt-5">
        <Button variant="outline" className="justify-self-start" disabled={pending} onClick={() => run(true)}>
          <UserCheckIcon /> Activar de nuevo
        </Button>
        <p className="text-xs text-muted-foreground">Podrá volver a entrar con su contraseña.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-2 border-t pt-5">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" className="justify-self-start" disabled={pending} />}>
          <UserXIcon /> Desactivar usuario
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar a {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cierra su sesión y ya no podrá entrar. Lo que registró se conserva. Lo puedes activar de nuevo cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => run(false)}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-xs text-muted-foreground">Por ejemplo, si ya no trabaja en el restaurante.</p>
    </section>
  );
}
