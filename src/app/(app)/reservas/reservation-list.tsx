import Link from "next/link";
import { MessageSquareTextIcon, PartyPopperIcon, PencilIcon, PhoneIcon, TriangleAlertIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/hours";
import { occasionLabel, RESERVATION_STATUS_CLASS, RESERVATION_STATUS_LABEL } from "@/lib/reservations";
import type { ReservationRow } from "@/lib/reservations-data";
import { cn } from "@/lib/utils";
import { StatusActions } from "./status-actions";

/** Reservas de un día, ordenadas por hora. */
export function ReservationList({ reservations, today }: { reservations: ReservationRow[]; today: string }) {
  return (
    <ul className="divide-y rounded-lg border">
      {reservations.map((r) => (
        <ReservationItem key={r.id} r={r} canMark={r.date <= today} />
      ))}
    </ul>
  );
}

function ReservationItem({ r, canMark }: { r: ReservationRow; canMark: boolean }) {
  const cancelled = r.status === "CANCELLED";
  const occasion = occasionLabel(r.occasion, r.honoree);

  return (
    <li className={cn("flex gap-3 px-4 py-3", cancelled && "text-muted-foreground")}>
      <div className="w-[4.5rem] shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{formatTime(r.time)}</div>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cn("font-medium", cancelled && "line-through")}>{r.customerName}</span>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" title="Personas">
            <UsersIcon className="size-3.5" /> {r.partySize} {r.partySize === 1 ? "persona" : "personas"}
          </span>
          {r.status !== "CONFIRMED" && (
            <span className={cn("rounded-md border px-1.5 text-xs", RESERVATION_STATUS_CLASS[r.status])}>
              {RESERVATION_STATUS_LABEL[r.status]}
            </span>
          )}
        </div>
        {occasion && (
          <p className="flex items-center gap-1.5 text-sm">
            <PartyPopperIcon className="size-3.5 shrink-0 text-muted-foreground" /> {occasion}
          </p>
        )}
        {r.note && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="break-words whitespace-pre-line">{r.note}</span>
          </p>
        )}
        {r.warning && (
          <p className="flex items-center gap-1.5 text-sm text-amber-800">
            <TriangleAlertIcon className="size-3.5 shrink-0" /> {r.warning}
          </p>
        )}
        <div className="-ml-2 flex flex-wrap items-center gap-1">
          {r.phone && (
            <Button variant="ghost" size="sm" render={<a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} />} nativeButton={false}>
              <PhoneIcon /> {r.phone}
            </Button>
          )}
          <StatusActions id={r.id} status={r.status} canMark={canMark} />
          <Button variant="ghost" size="sm" render={<Link href={`/reservas/${r.id}`} />} nativeButton={false}>
            <PencilIcon /> Editar
          </Button>
        </div>
      </div>
    </li>
  );
}
