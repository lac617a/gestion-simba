import type { Metadata } from "next";
import Link from "next/link";
import { ChefHatIcon, PencilIcon, PlusIcon } from "lucide-react";
import { FlashToast } from "@/components/flash-toast";
import { Button } from "@/components/ui/button";
import { CURRENCY } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { formatLongDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { productionTotal } from "@/lib/production";
import { getProductionDays } from "@/lib/production-data";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Producción · Gestión Simba" };

/** Jornadas de producción / preparación: cuándo fueron y quién asistió (historial). */
export default async function ProductionPage({ searchParams }: PageProps<"/gestion/produccion">) {
  await verifySession();
  const params = await searchParams;
  const [days, settings] = await Promise.all([getProductionDays(), getSettings()]);
  const money = (v: number) => formatMoney(v, CURRENCY);

  const flash = params.creado
    ? "Jornada registrada"
    : params.actualizado
      ? "Cambios guardados"
      : params.eliminado
        ? "Jornada eliminada"
        : null;

  return (
    <div className="grid gap-5">
      {flash && <FlashToast message={flash} />}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Producción</h1>
          <p className="text-sm text-muted-foreground">
            Días de preparación. Cada asistente cobra {money(settings.productionPay)} fijos + excedente; se suma a su pago
            semanal.
          </p>
        </div>
        <Button render={<Link href="/gestion/produccion/nueva" />} nativeButton={false} size="lg">
          <PlusIcon />
          Nueva
        </Button>
      </div>

      {days.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <ChefHatIcon className="size-6" />
          Todavía no hay jornadas de producción.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {days.map((day) => (
            <li key={day.id} className="grid gap-2 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-medium first-letter:uppercase">{formatLongDate(day.date)}</h2>
                <span className="text-sm tabular-nums">
                  {day.attendees.length} {day.attendees.length === 1 ? "asistente" : "asistentes"} ·{" "}
                  <span className="font-semibold">{money(productionTotal(day.attendees))}</span>
                </span>
              </div>
              {day.note && <p className="text-sm text-muted-foreground italic">{day.note}</p>}
              <ul className="flex flex-wrap gap-1.5 text-sm">
                {day.attendees.map((a) => (
                  <li key={a.employeeId} className="rounded-full bg-muted px-2.5 py-0.5">
                    {a.name}
                    {a.extraPay > 0 && <span className="text-muted-foreground"> · +{money(a.extraPay)}</span>}
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 justify-self-start"
                render={<Link href={`/gestion/produccion/${day.id}`} />}
                nativeButton={false}
              >
                <PencilIcon /> Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
