"use client";

import { ErrorScreen, type ErrorProps } from "@/components/error-screen";

/** Falla antes de armar el menú (ej. al verificar la sesión): pantalla de error sola. */
export default function GestionError(props: ErrorProps) {
  return (
    <div className="px-4">
      <ErrorScreen {...props} />
    </div>
  );
}
