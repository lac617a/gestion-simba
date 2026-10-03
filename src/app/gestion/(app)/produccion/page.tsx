import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDaysIcon, ChefHatIcon, HistoryIcon, PencilIcon, PlusIcon, type LucideIcon } from "lucide-react";
import { FlashToast } from "@/components/flash-toast";
import { Button } from "@/components/ui/button";
import { ViewTabs } from "@/components/view-tabs";
import { CURRENCY } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { formatLongDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { productionTotal } from "@/lib/production";
import { getProductionActivity, getProductionDays } from "@/lib/production-data";
import { loadProduction, productionHref } from "@/lib/search-params";
import { getSettings } from "@/lib/settings";
import { ProductionHistory } from "./production-history";

export const metadata: Metadata = { title: "Producción · Gestión Simba" };

const money = (v: number) => formatMoney(v, CURRENCY);

/** Cuántos cambios muestra el historial. */
const HISTORY_LIMIT = 100;

/** Jornadas de producción / preparación (cuándo fueron y quién asistió) y el historial de cambios. */
export default async function ProductionPage({ searchParams }: PageProps<"/gestion/produccion">) {
  await verifyAdmin();
  const [{ ver }, settings] = await Promise.all([loadProduction(searchParams), getSettings()]);

  return (
    <div className="grid gap-5">
      <FlashToast messages={{ creado: "Jornada registrada", actualizado: "Cambios guardados", eliminado: "Jornada eliminada" }} />

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

      <ViewTabs
        label="Qué ver"
        current={ver}
        tabs={[
          { key: "jornadas", label: "Jornadas", icon: CalendarDaysIcon, href: productionHref("/gestion/produccion", { ver: "jornadas" }) },
          { key: "historial", label: "Historial", icon: HistoryIcon, href: productionHref("/gestion/produccion", { ver: "historial" }) },
        ]}
      />

      {ver === "jornadas" ? <Days /> : <Changes />}
    </div>
  );
}

function Empty({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
      <Icon className="size-6" />
      {children}
    </div>
  );
}

/** Las jornadas, de la más reciente hacia atrás. */
async function Days() {
  const days = await getProductionDays();
  if (days.length === 0) return <Empty icon={ChefHatIcon}>Todavía no hay jornadas de producción.</Empty>;

  return (
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
  );
}

/** Quién registró, editó o eliminó cada jornada y qué cambió (también de las eliminadas). */
async function Changes() {
  const entries = await getProductionActivity(HISTORY_LIMIT);
  if (entries.length === 0) return <Empty icon={HistoryIcon}>Todavía no hay cambios en las jornadas.</Empty>;

  return (
    <section className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Quién registró, editó o eliminó cada jornada y qué cambió
        {entries.length === HISTORY_LIMIT ? ` (los últimos ${HISTORY_LIMIT} cambios)` : ""}.
      </p>
      <ProductionHistory entries={entries} withDay />
    </section>
  );
}
