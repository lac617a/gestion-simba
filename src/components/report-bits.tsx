import { DownloadIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tarjeta de un total. `strong` resalta el total principal. */
export function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-lg p-3", strong ? "bg-primary text-primary-foreground" : "bg-muted/60")}>
      <dt className={cn("text-xs", strong ? "opacity-80" : "text-muted-foreground")}>{label}</dt>
      <dd className="text-base font-semibold tabular-nums sm:text-xl">{value}</dd>
      {hint && <dd className={cn("text-xs", strong ? "opacity-80" : "text-muted-foreground")}>{hint}</dd>}
    </div>
  );
}

/** Aviso de días del periodo que ya pasaron y no están cerrados. */
export function UnclosedWarning({ days, what }: { days: number; what: string }) {
  if (days <= 0) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>
        {days} {days === 1 ? "día de este periodo no está cerrado" : "días de este periodo no están cerrados"}: {what}
      </span>
    </p>
  );
}

export function CsvButton({ href, label = "Exportar CSV" }: { href: string; label?: string }) {
  return (
    <Button variant="outline" size="sm" render={<a href={href} download />} nativeButton={false}>
      <DownloadIcon />
      {label}
    </Button>
  );
}
