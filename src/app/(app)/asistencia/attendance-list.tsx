"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { CheckCheckIcon, StickyNoteIcon } from "lucide-react";
import { toast } from "sonner";
import { markPendingAsWorked, setAttendanceNote, setAttendanceStatus } from "@/app/actions/attendance";
import type { CloseDayState } from "@/app/actions/closing";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countByStatus,
  SELECTABLE_STATUSES,
  STATUS_ACTIVE_CLASS,
  STATUS_LABEL,
} from "@/lib/attendance";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DayClosing, DayRow } from "@/lib/workdays";
import { CloseDayPanel } from "./close-day-panel";

type StatusMap = Record<string, AttendanceStatus>;

type Props = {
  date: string;
  rows: DayRow[];
  editable: boolean;
  /** Panel de cierre (solo días abiertos) */
  closing?: {
    action: (state: CloseDayState, formData: FormData) => Promise<CloseDayState>;
    currency: Currency;
    saved: DayClosing | null;
  };
};

export function AttendanceList({ date, rows, editable, closing }: Props) {
  const [statuses, setOptimistic] = useOptimistic(
    Object.fromEntries(rows.map((r) => [r.employeeId, r.status])) as StatusMap,
    (state: StatusMap, update: StatusMap) => ({ ...state, ...update })
  );
  const [, startTransition] = useTransition();
  const counts = countByStatus(Object.values(statuses));

  function changeStatus(row: DayRow, status: AttendanceStatus) {
    if (!row.attendanceId || statuses[row.employeeId] === status) return;
    const attendanceId = row.attendanceId;
    startTransition(async () => {
      setOptimistic({ [row.employeeId]: status });
      const res = await setAttendanceStatus(attendanceId, status);
      if (!res.ok) toast.error(res.error);
    });
  }

  function markAllPending() {
    const pending = rows.filter((r) => statuses[r.employeeId] === "PENDING");
    startTransition(async () => {
      setOptimistic(Object.fromEntries(pending.map((r) => [r.employeeId, "WORKED"])));
      const res = await markPendingAsWorked(date);
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.count} marcados como “Trabajó”`);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Summary counts={counts} />
        {editable && counts.PENDING > 0 && (
          <Button variant="outline" onClick={markAllPending} className="ml-auto">
            <CheckCheckIcon />
            Marcar {counts.PENDING} pendiente{counts.PENDING === 1 ? "" : "s"} como Trabajó
          </Button>
        )}
      </div>

      <ul className="divide-y rounded-lg border">
        {rows.map((row) => {
          const current = statuses[row.employeeId];
          return (
            <li
              key={row.employeeId}
              className={cn(
                "grid gap-2 px-4 py-3 sm:flex sm:items-center sm:gap-4",
                current === "PENDING" && "border-l-4 border-l-amber-500 pl-3"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{row.name}</span>
                  {editable && current === "PENDING" && (
                    <span className="text-xs font-medium text-amber-700">Pendiente</span>
                  )}
                </div>
                {row.position && <div className="truncate text-sm text-muted-foreground">{row.position}</div>}
                {row.attendanceId && (editable || row.note) && (
                  <NoteEditor attendanceId={row.attendanceId} note={row.note} editable={editable} />
                )}
              </div>

              {editable ? (
                <div
                  className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap"
                  role="group"
                  aria-label={`Asistencia de ${row.name}`}
                >
                  {SELECTABLE_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={current === status}
                      onClick={() => changeStatus(row, status)}
                      className={cn(
                        "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        current === status
                          ? STATUS_ACTIVE_CLASS[status]
                          : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              ) : (
                <span
                  className={cn(
                    "justify-self-start rounded-lg border px-2.5 py-1 text-xs font-medium",
                    STATUS_ACTIVE_CLASS[current]
                  )}
                >
                  {STATUS_LABEL[current]}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {editable && closing && (
        <CloseDayPanel
          action={closing.action}
          currency={closing.currency}
          saved={closing.saved}
          rows={rows.map((r) => ({ employeeId: r.employeeId, name: r.name, status: statuses[r.employeeId] }))}
        />
      )}
    </div>
  );
}

function Summary({ counts }: { counts: ReturnType<typeof countByStatus> }) {
  const items = (["WORKED", "PENDING", "REST", "EXTRA_REST", "LEAVE", "ABSENT"] as const).filter(
    (s) => s === "WORKED" || counts[s] > 0
  );
  return (
    <dl className="flex flex-wrap gap-2 text-sm">
      {items.map((s) => (
        <div key={s} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
          <dt className="text-muted-foreground">{STATUS_LABEL[s]}</dt>
          <dd className="font-semibold tabular-nums">{counts[s]}</dd>
        </div>
      ))}
    </dl>
  );
}

function NoteEditor({ attendanceId, note, editable }: { attendanceId: string; note: string | null; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  if (!editable) return <p className="mt-1 text-sm text-muted-foreground italic">{note}</p>;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          cancelled.current = false;
          setEditing(true);
        }}
        className="mt-1 flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
      >
        <StickyNoteIcon className="size-3.5 shrink-0" />
        {note ? <span className="italic">{note}</span> : <span>Agregar nota</span>}
      </button>
    );
  }

  function save() {
    if (cancelled.current) return; // se canceló con Escape
    const value = inputRef.current?.value ?? "";
    setEditing(false);
    if (value.trim() === (note ?? "")) return;
    startTransition(async () => {
      const res = await setAttendanceNote(attendanceId, value);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <Input
      ref={inputRef}
      autoFocus
      defaultValue={note ?? ""}
      maxLength={200}
      placeholder="Ej. llegó tarde, salió temprano…"
      aria-label="Nota"
      className="mt-1 h-8"
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          setEditing(false);
        }
      }}
    />
  );
}
