import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateRange } from "@/lib/dates";
import { shiftPeriod, type Period } from "@/lib/periods";
import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
  period: Period;
  presets: { label: string; period: Period }[];
};

const same = (a: Period, b: Period) => a.from === b.from && a.to === b.to;

/** Selector de periodo por URL (?desde&hasta): flechas, atajos y rango libre. */
export function PeriodNav({ basePath, period, presets }: Props) {
  const href = (p: Period) => `${basePath}?desde=${p.from}&hasta=${p.to}`;

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
          <ChevronLeftIcon />
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
          <ChevronRightIcon />
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
                {p.label}
              </Link>
            );
          })}
        </div>

        <details className="group">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Otras fechas</summary>
          <form action={basePath} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={period.from} required className="w-auto" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={period.to} required className="w-auto" />
            </div>
            <Button type="submit" variant="outline">
              Ver
            </Button>
          </form>
        </details>
      </div>
    </div>
  );
}
