"use client";

import { useTransition } from "react";
import { MonitorSmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { logoutEverywhere } from "@/app/actions/settings";
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

export function LogoutEverywhereButton() {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" className="justify-self-start" disabled={pending} />}>
        <MonitorSmartphoneIcon /> Cerrar sesión en los demás dispositivos
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar las demás sesiones?</AlertDialogTitle>
          <AlertDialogDescription>
            Cualquier otro celular o computadora tendrá que volver a entrar con la contraseña. Este dispositivo sigue conectado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                await logoutEverywhere();
                toast.success("Se cerró la sesión en los demás dispositivos");
              })
            }
          >
            Sí, cerrarlas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
