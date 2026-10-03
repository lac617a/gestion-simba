"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Señales para usar DENTRO de un <Link> cuando la navegación no es inmediata:
 * cambiar de pestaña, filtro, periodo o día deja la pantalla quieta mientras
 * llega la nueva (no hay esqueleto porque es la misma pantalla).
 */

/** Cambia el ícono del enlace por un círculo que gira mientras carga. */
export function PendingIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <LoaderCircleIcon aria-hidden className={cn("size-4 motion-safe:animate-spin", className)} /> : children;
}

/** El texto del enlace late mientras carga. */
export function PendingText({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={cn(pending && "motion-safe:animate-pulse")}>{children}</span>;
}
