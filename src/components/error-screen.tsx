"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

/**
 * Pantalla de los error.tsx: algo falló al cargar (conexión, base de datos…).
 * "Reintentar" vuelve a pedir la pantalla al servidor sin recargar todo.
 */
export function ErrorScreen({ error, retry }: ErrorProps) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      role="alert"
      icon={TriangleAlertIcon}
      tone="warning"
      title="No se pudo cargar esta pantalla"
      actions={
        <>
          <Button size="lg" disabled={pending} onClick={() => startTransition(retry)}>
            <RotateCwIcon className={cn(pending && "motion-safe:animate-spin")} />
            {pending ? "Reintentando…" : "Reintentar"}
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/gestion" />} nativeButton={false}>
            Ir al inicio
          </Button>
        </>
      }
    >
      <p>Puede ser la conexión a internet o el servidor. Intenta de nuevo en un momento.</p>
      {error.digest && <p className="text-xs">Si sigue pasando, comparte este código: {error.digest}</p>}
    </StatusScreen>
  );
}
