"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, isISODate } from "@/lib/dates";

// Sin prefetch: abrir la página de un día lo crea en la BD, y no debe pasar solo por mostrar el enlace.
const href = (date: string) => `/asistencia?fecha=${date}`;

export function DateNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Día anterior"
        render={<Link href={href(addDays(date, -1))} prefetch={false} />}
        nativeButton={false}
      >
        <ChevronLeftIcon />
      </Button>
      <Input
        type="date"
        aria-label="Fecha"
        value={date}
        onChange={(e) => {
          if (isISODate(e.target.value)) router.push(href(e.target.value));
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
        <ChevronRightIcon />
      </Button>
      {date !== today && (
        <Button variant="ghost" size="lg" render={<Link href={href(today)} prefetch={false} />} nativeButton={false}>
          Hoy
        </Button>
      )}
    </div>
  );
}
