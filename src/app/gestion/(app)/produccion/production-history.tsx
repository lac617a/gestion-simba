import Link from "next/link";
import { HistoryTimeline } from "@/components/history-timeline";
import { CURRENCY } from "@/lib/config";
import { formatDayMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { beforeHistory, describeProductionLog, type ProductionLogEntry } from "@/lib/production-log";

const TONE = { CREATED: "created", UPDATED: "updated", DELETED: "deleted" } as const;

/**
 * Historial de cambios de producción, del más reciente al más viejo. Con `withDay`
 * cada cambio dice de qué jornada es y enlaza a ella si todavía existe.
 */
export function ProductionHistory({ entries, withDay = false }: { entries: ProductionLogEntry[]; withDay?: boolean }) {
  const money = (v: number) => formatMoney(v, CURRENCY);
  return (
    <HistoryTimeline
      items={entries.map((e) => {
        const { title, details } = describeProductionLog(e, money);
        return {
          key: e.id,
          tone: TONE[e.action],
          title: withDay ? (
            <>
              {title} del <DayLabel entry={e} />
            </>
          ) : (
            title
          ),
          details,
          who: e.user ?? (beforeHistory(e) ? "Antes del historial" : null),
          at: e.at,
        };
      })}
    />
  );
}

function DayLabel({ entry: e }: { entry: ProductionLogEntry }) {
  const label = formatDayMonth(e.date);
  if (e.dayId) {
    return (
      <Link
        href={`/gestion/produccion/${e.dayId}`}
        className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
      >
        {label}
      </Link>
    );
  }
  return (
    <>
      {label}
      {e.action !== "DELETED" && <span className="font-normal text-muted-foreground"> (ya eliminada)</span>}
    </>
  );
}
