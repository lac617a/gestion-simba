"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { avisoParams, type Aviso } from "@/lib/search-params";

/**
 * Muestra el aviso que deja una acción al redirigir (?aviso=creado|actualizado|eliminado)
 * y lo quita de la dirección.
 */
export function FlashToast({ messages }: { messages: Partial<Record<Aviso, string>> }) {
  const [aviso, setAviso] = useQueryState("aviso", avisoParams.aviso);

  useEffect(() => {
    if (!aviso) return;
    const message = messages[aviso];
    if (message) toast.success(message, { id: `aviso-${aviso}` }); // con id no se repite si el efecto corre dos veces
    void setAviso(null, { scroll: false });
  }, [aviso, messages, setAviso]);

  return null;
}
