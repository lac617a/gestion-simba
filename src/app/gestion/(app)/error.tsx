"use client";

import { ErrorScreen, type ErrorProps } from "@/components/error-screen";

/** Si una pantalla falla al cargar, se ve esto dentro del menú (que sigue funcionando). */
export default function AppError(props: ErrorProps) {
  return <ErrorScreen {...props} />;
}
