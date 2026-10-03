import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { PendingIcon, PendingText } from "@/components/link-pending";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/dates";
import { shiftPeriod, type Period } from "@/lib/periods";
import { periodHref } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { PeriodRangeForm } from "./period-range-form";

type Props = {
  /** Dirección de la pantalla con sus otros parámetros (pestaña, búsqueda…); se le agrega ?desde&hasta */
  baseHref: string;
  period: Period;
  presets: { label: string; period: Period }[];
};

const same = (a: Period, b: Period) => a.from === b.from && a.to === b.to;

/** Selector de periodo por la dirección (?desde&hasta): flechas, atajos y rango libre. */
export function PeriodNav({ baseHref, period, presets }: Props) {
  const href = (p: Period) => periodHref(baseHref, { desde: p.from, hasta: p.to });

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Periodo anterior"
          render={<Link href={href(shiftPeriod(period, -1))} />}
          nativeButton={false}
        >
          <PendingIcon>
            <ChevronLeftIcon />
          </PendingIcon>
        </Button>
        <p className="min-w-0 flex-1 text-center font-medium sm:flex-none sm:px-2">
          {formatDateRange(period.from, period.to)}
        </p>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Periodo siguiente"
          render={<Link href={href(shiftPeriod(period, 1))} />}
          nativeButton={false}
        >
          <PendingIcon>
            <ChevronRightIcon />
          </PendingIcon>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Periodos rápidos">
          {presets.map((p) => {
            const active = same(p.period, period);
            return (
              <Link
                key={p.label}
                href={href(p.period)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 text-muted-foreground hover:text-foreground",
                  active && "bg-background text-foreground shadow-sm"
                )}
              >
                <PendingText>{p.label}</PendingText>
              </Link>
            );
          })}
        </div>

        <details className="group">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Otras fechas</summary>
          <PeriodRangeForm key={`${period.from}-${period.to}`} period={period} />
        </details>
      </div>
    </div>
  );
}
