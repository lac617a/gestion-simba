import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewTab<K extends string> = { key: K; label: string; icon: LucideIcon; href: string };

/** Pestañas de una pantalla. Cada una es un enlace: la pestaña queda en la dirección (?ver=…). */
export function ViewTabs<K extends string>({ label, tabs, current }: { label: string; tabs: ViewTab<K>[]; current: K }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1 text-sm sm:w-80" role="group" aria-label={label}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-muted-foreground",
            current === t.key && "bg-background text-foreground shadow-sm"
          )}
        >
          <t.icon className="size-4" /> {t.label}
        </Link>
      ))}
    </div>
  );
}
