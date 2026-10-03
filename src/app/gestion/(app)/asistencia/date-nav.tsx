"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PendingIcon, PendingText } from "@/components/link-pending";
import { addDays } from "@/lib/dates";
import { dayHref, dayParams } from "@/lib/search-params";

// Sin prefetch: abrir la página de un día lo crea en la BD, y no debe pasar solo por mostrar el enlace.
const href = (fecha: string) => dayHref("/gestion/asistencia", { fecha });

export function DateNav({ date, today }: { date: string; today: string }) {
  // Elegir otra fecha cambia ?fecha= y el servidor carga ese día (queda en el historial del navegador).
  const [, setFecha] = useQueryState("fecha", dayParams.fecha.withOptions({ shallow: false, history: "push" }));

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Día anterior"
        render={<Link href={href(addDays(date, -1))} prefetch={false} />}
        nativeButton={false}
      >
        <PendingIcon>
          <ChevronLeftIcon />
        </PendingIcon>
      </Button>
      <Input
        type="date"
        aria-label="Fecha"
        value={date}
        onChange={(e) => {
          const parsed = dayParams.fecha.parse(e.target.value);
          if (parsed) void setFecha(parsed);
        }}
        className="h-9 w-auto"
      />
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Día siguiente"
        render={<Link href={href(addDays(date, 1))} prefetch={false} />}
        nativeButton={false}
      >
        <PendingIcon>
          <ChevronRightIcon />
        </PendingIcon>
      </Button>
      {date !== today && (
        <Button variant="ghost" size="lg" render={<Link href={href(today)} prefetch={false} />} nativeButton={false}>
          <PendingText>Hoy</PendingText>
        </Button>
      )}
    </div>
  );
}
