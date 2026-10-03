import { APP_TIMEZONE } from "@/lib/config";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  key: string;
  /** Color del punto: verde = registró, azul = editó, ámbar = cambió el estado, rojo = eliminó */
  tone: "created" | "updated" | "status" | "deleted";
  title: React.ReactNode;
  details: string[];
  /** Quién lo hizo (null si no se sabe) y cuándo */
  who: string | null;
  at: Date;
};

const DOT: Record<TimelineItem["tone"], string> = {
  created: "bg-emerald-500",
  updated: "bg-sky-500",
  status: "bg-amber-500",
  deleted: "bg-red-500",
};

const momentFormat = new Intl.DateTimeFormat("es-CO", { timeZone: APP_TIMEZONE, dateStyle: "medium", timeStyle: "short" });

/** "3 oct 2026, 10:15 a. m." en la hora del restaurante */
export const formatMoment = (at: Date) => momentFormat.format(at);

/** Historial de cambios en línea de tiempo (quién hizo qué y cuándo), del más reciente al más viejo. */
export function HistoryTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="ml-1.5 grid gap-4 border-l pl-5">
      {items.map((e) => (
        <li key={e.key} className="relative grid gap-0.5">
          <span className={cn("absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-background", DOT[e.tone])} />
          <p className="text-sm font-medium">{e.title}</p>
          {e.details.length > 0 && (
            <ul className="grid gap-0.5 text-sm">
              {e.details.map((d, i) => (
                <li key={i} className="break-words">
                  {d}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {e.who ? `${e.who} · ` : ""}
            {formatMoment(e.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
