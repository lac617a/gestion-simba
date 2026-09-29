"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { CheckCheckIcon, LockIcon, StickyNoteIcon } from "lucide-react";
import { toast } from "sonner";
import { markPendingAsWorked, setAttendanceNote, setAttendanceShift, setAttendanceStatus } from "@/app/actions/attendance";
import type { CloseDayState, MorningCloseState } from "@/app/actions/closing";
import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countByStatus,
  SELECTABLE_STATUSES,
  STATUS_ACTIVE_CLASS,
  STATUS_LABEL,
} from "@/lib/attendance";
import { inShift, SHIFT_LABEL } from "@/lib/closing";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DayClosing, DayRow } from "@/lib/workdays";
import { CloseDayPanel } from "./close-day-panel";
import { MorningShiftPanel } from "./morning-shift-panel";

type Entry = { status: AttendanceStatus; shift: WorkShift | null };
type EntryMap = Record<string, Entry>;

const SHIFT_OPTIONS: WorkShift[] = ["MORNING", "EVENING", "BOTH"];
const inMorning = (e: Entry) => e.status === "WORKED" && (e.shift === "MORNING" || e.shift === "BOTH");

type Props = {
  date: string;
  rows: DayRow[];
  editable: boolean;
  /** Día de doble turno (mañana y tarde) */
  doubleShift: boolean;
  /** El turno de la mañana ya se cerró: no se puede cambiar quién lo hizo */
  morningClosed: boolean;
  /** Paneles de cierre (solo días abiertos) */
  closing?: {
    action: (state: CloseDayState, formData: FormData) => Promise<CloseDayState>;
    morningAction: (state: MorningCloseState, formData: FormData) => Promise<MorningCloseState>;
    reopenMorning: () => Promise<void>;
    currency: Currency;
    saved: DayClosing | null;
  };
};

export function AttendanceList({ date, rows, editable, doubleShift, morningClosed, closing }: Props) {
  const [entries, setOptimistic] = useOptimistic(
    Object.fromEntries(rows.map((r) => [r.employeeId, { status: r.status, shift: r.shift }])) as EntryMap,
    (state: EntryMap, update: EntryMap) => ({ ...state, ...update })
  );
  const [, startTransition] = useTransition();
  const counts = countByStatus(Object.values(entries).map((e) => e.status));
  const current = rows.map((r) => ({ ...r, ...entries[r.employeeId] }));
  const shiftCounts = {
    morning: current.filter((r) => inShift(r, "MORNING")).length,
    evening: current.filter((r) => inShift(r, "EVENING")).length,
  };

  function changeStatus(row: DayRow, status: AttendanceStatus) {
    const prev = entries[row.employeeId];
    if (!row.attendanceId || prev.status === status) return;
    const attendanceId = row.attendanceId;
    // Mismo criterio que el servidor: se conserva el turno si sigue en Trabajó.
    const shift = doubleShift && status === "WORKED" ? (prev.status === "WORKED" ? prev.shift : morningClosed ? "EVENING" : null) : null;
    startTransition(async () => {
      setOptimistic({ [row.employeeId]: { status, shift } });
      const res = await setAttendanceStatus(attendanceId, status);
      if (!res.ok) toast.error(res.error);
    });
  }

  function changeShift(row: DayRow, shift: WorkShift) {
    if (!row.attendanceId || entries[row.employeeId].shift === shift) return;
    const attendanceId = row.attendanceId;
    startTransition(async () => {
      setOptimistic({ [row.employeeId]: { status: "WORKED", shift } });
      const res = await setAttendanceShift(attendanceId, shift);
      if (!res.ok) toast.error(res.error);
    });
  }

  function markAllPending() {
    const pending = rows.filter((r) => entries[r.employeeId].status === "PENDING");
    const shift: WorkShift | null = doubleShift && morningClosed ? "EVENING" : null;
    startTransition(async () => {
      setOptimistic(Object.fromEntries(pending.map((r) => [r.employeeId, { status: "WORKED" as const, shift }])));
      const res = await markPendingAsWorked(date);
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.count} marcados como “Trabajó”`);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Summary counts={counts} shifts={doubleShift ? shiftCounts : null} />
        {editable && counts.PENDING > 0 && (
          <Button variant="outline" onClick={markAllPending} className="ml-auto">
            <CheckCheckIcon />
            Marcar {counts.PENDING} pendiente{counts.PENDING === 1 ? "" : "s"} como Trabajó
          </Button>
        )}
      </div>

      <ul className="divide-y rounded-lg border">
        {rows.map((row) => {
          const entry = entries[row.employeeId];
          const status = entry.status;
          const needsShift = doubleShift && status === "WORKED";
          // Con la mañana cerrada, quien la hizo queda fijo en Trabajó.
          const lockedStatus = morningClosed && inMorning(entry);
          return (
            <li
              key={row.employeeId}
              className={cn(
                "grid gap-2 px-4 py-3 sm:flex sm:items-center sm:gap-4",
                (status === "PENDING" || (editable && needsShift && !entry.shift)) && "border-l-4 border-l-amber-500 pl-3"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{row.name}</span>
                  {editable && status === "PENDING" && (
                    <span className="text-xs font-medium text-amber-700">Pendiente</span>
                  )}
                  {editable && needsShift && !entry.shift && (
                    <span className="text-xs font-medium text-amber-700">Falta el turno</span>
                  )}
                </div>
                {row.position && <div className="truncate text-sm text-muted-foreground">{row.position}</div>}
                {row.attendanceId && (editable || row.note) && (
                  <NoteEditor attendanceId={row.attendanceId} note={row.note} editable={editable} />
                )}
              </div>

              {editable ? (
                <div className="grid gap-1.5 sm:justify-items-end">
                  <div
                    className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap"
                    role="group"
                    aria-label={`Asistencia de ${row.name}`}
                  >
                    {SELECTABLE_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={status === s}
                        disabled={lockedStatus && s !== "WORKED"}
                        title={lockedStatus && s !== "WORKED" ? "Hizo el turno de la mañana, que ya se cerró" : undefined}
                        onClick={() => changeStatus(row, s)}
                        className={cn(
                          "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
                          status === s
                            ? STATUS_ACTIVE_CLASS[s]
                            : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  {needsShift && (
                    <ShiftPicker
                      name={row.name}
                      value={entry.shift}
                      // Con la mañana cerrada solo se puede cambiar sin entrar ni salir de la mañana.
                      isAllowed={(s) => !morningClosed || inMorning(entry) === inMorning({ status: "WORKED", shift: s })}
                      onChange={(s) => changeShift(row, s)}
                    />
                  )}
                </div>
              ) : (
                <span className="flex flex-wrap items-center gap-1.5 justify-self-start">
                  <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium", STATUS_ACTIVE_CLASS[status])}>
                    {STATUS_LABEL[status]}
                  </span>
                  {needsShift && entry.shift && (
                    <span className="rounded-lg border px-2.5 py-1 text-xs text-muted-foreground">{SHIFT_LABEL[entry.shift]}</span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {editable && closing && doubleShift && (
        <MorningShiftPanel
          action={closing.morningAction}
          reopen={closing.reopenMorning}
          currency={closing.currency}
          closed={morningClosed}
          savedTips={closing.saved?.tipsMorning ?? null}
          rows={current}
        />
      )}

      {editable && closing && (
        <CloseDayPanel
          action={closing.action}
          currency={closing.currency}
          saved={closing.saved}
          doubleShift={doubleShift}
          morningClosed={morningClosed}
          rows={current.map((r) => ({
            employeeId: r.employeeId,
            name: r.name,
            status: r.status,
            shift: r.shift,
            savedPay: r.dailyPay,
            payRate: r.payRate,
          }))}
        />
      )}
    </div>
  );
}

function ShiftPicker({
  name,
  value,
  isAllowed,
  onChange,
}: {
  name: string;
  value: WorkShift | null;
  isAllowed: (shift: WorkShift) => boolean;
  onChange: (shift: WorkShift) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`Turno de ${name}`}>
      <span className="text-xs text-muted-foreground">Turno:</span>
      {SHIFT_OPTIONS.map((s) => {
        const allowed = isAllowed(s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={value === s}
            disabled={!allowed}
            title={allowed ? undefined : "El turno de la mañana ya se cerró"}
            onClick={() => onChange(s)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
              value === s
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {!allowed && <LockIcon className="size-3" />}
            {SHIFT_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}

function Summary({
  counts,
  shifts,
}: {
  counts: ReturnType<typeof countByStatus>;
  shifts: { morning: number; evening: number } | null;
}) {
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
      {shifts && (
        <>
          <div className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sky-900">
            <dt>Mañana</dt>
            <dd className="font-semibold tabular-nums">{shifts.morning}</dd>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sky-900">
            <dt>Tarde</dt>
            <dd className="font-semibold tabular-nums">{shifts.evening}</dd>
          </div>
        </>
      )}
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
