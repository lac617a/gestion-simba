"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Muestra un aviso tras un redirect y limpia el parámetro de la URL. */
export function FlashToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    toast.success(message);
    const params = new URLSearchParams(searchParams);
    params.delete("creado");
    params.delete("actualizado");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [message, pathname, router, searchParams]);

  return null;
}
