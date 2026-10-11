"use client";

import { useActionState, useEffect, useTransition } from "react";
import { DownloadIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { saveBackupEmail, sendBackupNow } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Respaldos: a qué correo llega el de cada mañana, descargar uno ahora o
 * mandarlo ya al correo (para comprobar que llega).
 */
export function BackupSettings({ email, lastSent, canEmail }: { email: string; lastSent: string | null; canEmail: boolean }) {
  const [state, action, pending] = useActionState(saveBackupEmail, undefined);
  const [sending, startSending] = useTransition();

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  function sendNow() {
    startSending(async () => {
      const result = await sendBackupNow();
      if (result.ok) toast.success(`Respaldo enviado a ${email}`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      {/* key: tras guardar se remonta con el correo que llega del servidor */}
      <form key={email} action={action} className="grid gap-2">
        <Label htmlFor="backupEmail">Correo de respaldos</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="backupEmail"
            name="backupEmail"
            type="email"
            defaultValue={email}
            placeholder="Vacío = sin respaldo por correo"
            className="max-w-80 flex-1"
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cada mañana llega aquí un archivo con todos los datos. Trae los pagos de los empleados y las ventas: usa un correo
          que solo vean los dueños, no el de las reservas.
        </p>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </form>

      <div className="grid gap-2 border-t pt-4">
        <p className="text-sm">
          {lastSent ? `Último respaldo por correo: ${lastSent}` : "Todavía no se ha enviado ningún respaldo por correo."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/gestion/configuracion/respaldos/descargar" download />} nativeButton={false}>
            <DownloadIcon /> Descargar respaldo
          </Button>
          {email && canEmail && (
            <Button variant="ghost" disabled={sending} onClick={sendNow}>
              <SendIcon /> {sending ? "Enviando…" : "Enviar ahora al correo"}
            </Button>
          )}
        </div>
        {email && !canEmail && (
          <p className="text-xs text-amber-800">Falta configurar Resend (RESEND_API_KEY) para que salga por correo.</p>
        )}
      </div>
    </div>
  );
}
