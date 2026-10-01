"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronDownIcon, LockIcon, SearchIcon, Undo2Icon, XIcon } from "lucide-react";
import type { AttendanceStatus, WorkShift } from "@/generated/prisma/enums";
import { Input } from "@/components/ui/input";
import { searchKey, SELECTABLE_STATUSES, STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/attendance";
import { SHIFT_LABEL } from "@/lib/closing";
import { cn } from "@/lib/utils";
import type { DayRow } from "@/lib/workdays";

type Entry = { status: AttendanceStatus; shift: WorkShift | null };

const SHIFT_SHORT: Record<WorkShift, string> = { MORNING: "M", EVENING: "T", BOTH: "M+T" };
const SHIFTS: WorkShift[] = ["MORNING", "EVENING", "BOTH"];
const NO_POSITION = "Sin puesto";

const inMorning = (e: Entry) => e.status === "WORKED" && (e.shift === "MORNING" || e.shift === "BOTH");

/** Punto de color de cada estado en el menú. */
const STATUS_DOT: Record<AttendanceStatus, string> = {
  PENDING: "bg-amber-400",
  WORKED: "bg-emerald-500",
  REST: "bg-slate-400",
  EXTRA_REST: "bg-sky-500",
  ABSENT: "bg-red-500",
  LEAVE: "bg-violet-500",
};

type Props = {
  rows: (DayRow & Entry)[];
  editable: boolean;
  doubleShift: boolean;
  morningClosed: boolean;
  /** Marca un estado (y el turno, en doble turno) */
  onSet: (row: DayRow, status: AttendanceStatus, shift?: WorkShift) => void;
  /** Vuelve a Pendiente */
  onReset: (row: DayRow) => void;
};

/**
 * Vista rápida: todos los empleados como chips, agrupados por puesto. Un toque
 * a un pendiente lo marca "Trabajó"; la flecha abre los demás estados (y los
 * turnos en días de doble turno).
 */
export function QuickAttendance({ rows, editable, doubleShift, morningClosed, onSet, onReset }: Props) {
  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const needsAttention = (r: Entry) => r.status === "PENDING" || (doubleShift && r.status === "WORKED" && !r.shift);
  const attentionCount = rows.filter(needsAttention).length;
  const key = searchKey(query.trim());
  const visible = rows.filter((r) => (!key || searchKey(r.name).includes(key)) && (!onlyPending || needsAttention(r)));

  const groups = new Map<string, typeof rows>();
  for (const r of visible) {
    const g = r.position ?? NO_POSITION;
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }
  const ordered = [...groups.entries()].sort(
    ([a], [b]) => Number(a === NO_POSITION) - Number(b === NO_POSITION) || a.localeCompare(b, "es")
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empleado…"
            aria-label="Buscar empleado"
            className="h-9 pr-8 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Quitar búsqueda"
              className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        {editable && (
          <button
            type="button"
            aria-pressed={onlyPending}
            onClick={() => setOnlyPending((v) => !v)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm",
              onlyPending ? "border-amber-500 bg-amber-50 text-amber-900" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Por marcar <span className="font-semibold tabular-nums">{attentionCount}</span>
          </button>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {onlyPending && !key ? "No falta nadie por marcar." : "Nadie coincide con la búsqueda."}
        </p>
      ) : (
        ordered.map(([position, people]) => {
          const working = people.filter((p) => p.status === "WORKED").length;
          const pending = people.filter(needsAttention).length;
          return (
            <section key={position} className="grid gap-2">
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <h3 className="text-sm font-medium">
                  {position} <span className="font-normal text-muted-foreground">· {people.length}</span>
                </h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {working} {working === 1 ? "trabaja" : "trabajan"}
                  {pending > 0 && <span className="text-amber-700"> · {pending} por marcar</span>}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {people.map((r) => (
                  <li key={r.employeeId}>
                    <Chip
                      row={r}
                      editable={editable}
                      doubleShift={doubleShift}
                      morningClosed={morningClosed}
                      onSet={onSet}
                      onReset={onReset}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function chipSuffix(r: Entry, doubleShift: boolean) {
  if (r.status === "WORKED") return doubleShift ? (r.shift ? SHIFT_SHORT[r.shift] : "¿turno?") : null;
  if (r.status === "PENDING") return null;
  return STATUS_LABEL[r.status];
}

function Chip({
  row,
  editable,
  doubleShift,
  morningClosed,
  onSet,
  onReset,
}: {
  row: DayRow & Entry;
} & Pick<Props, "editable" | "doubleShift" | "morningClosed" | "onSet" | "onReset">) {
  const [open, setOpen] = useState(false);
  const suffix = chipSuffix(row, doubleShift);
  const missingShift = doubleShift && row.status === "WORKED" && !row.shift;
  const label = (
    <>
      <span className="truncate">{row.name}</span>
      {suffix && <span className={cn("text-xs opacity-75", missingShift && "font-medium text-amber-800 opacity-100")}>· {suffix}</span>}
    </>
  );
  const base = cn(
    "inline-flex max-w-full items-center rounded-full border text-sm",
    STATUS_CHIP_CLASS[row.status],
    missingShift && "border-amber-400",
    row.status === "PENDING" && "border-dashed"
  );

  if (!editable || !row.attendanceId) {
    return (
      <span className={cn(base, "gap-1 px-3 py-1")} title={row.position ?? undefined}>
        {label}
      </span>
    );
  }

  // Con la mañana cerrada, quien la hizo no puede salir de ella (ni quien no, entrar).
  const lockedInMorning = morningClosed && inMorning(row);
  const shiftAllowed = (s: WorkShift) => !morningClosed || inMorning(row) === inMorning({ status: "WORKED", shift: s });

  function tap() {
    // Lo más común (pendiente → Trabajó) es un solo toque; en doble turno hay que elegir el turno.
    if (row.status === "PENDING" && !doubleShift) onSet(row, "WORKED");
    else setOpen(true);
  }

  const item = "flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted";

  return (
    <span className={cn(base, "overflow-hidden")}>
      <button
        type="button"
        onClick={tap}
        title={row.status === "PENDING" && !doubleShift ? "Marcar Trabajó" : "Cambiar"}
        className="inline-flex min-w-0 items-center gap-1 py-1 pr-1.5 pl-3 outline-none focus-visible:bg-black/5"
      >
        {label}
      </button>
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          aria-label={`Más opciones para ${row.name}`}
          className="grid h-full place-items-center self-stretch border-l border-current/15 px-1.5 outline-none hover:bg-black/5 focus-visible:bg-black/5"
        >
          <ChevronDownIcon className="size-3.5" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="start" className="z-50 outline-none">
            <Menu.Popup className="min-w-52 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
              <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">{row.name}</p>
              {doubleShift
                ? SHIFTS.map((s) => {
                    const current = row.status === "WORKED" && row.shift === s;
                    return (
                      <Menu.Item
                        key={s}
                        disabled={!shiftAllowed(s)}
                        onClick={() => !current && onSet(row, "WORKED", s)}
                        className={item}
                      >
                        <span className={cn("size-2 rounded-full", STATUS_DOT.WORKED)} />
                        Trabajó · {SHIFT_LABEL[s]}
                        {!shiftAllowed(s) && <LockIcon className="ml-auto size-3.5" />}
                        {current && <CheckIcon className="ml-auto size-4" />}
                      </Menu.Item>
                    );
                  })
                : null}
              {SELECTABLE_STATUSES.filter((s) => !(doubleShift && s === "WORKED")).map((s) => {
                const current = row.status === s;
                return (
                  <Menu.Item
                    key={s}
                    disabled={lockedInMorning}
                    onClick={() => !current && onSet(row, s)}
                    className={item}
                  >
                    <span className={cn("size-2 rounded-full", STATUS_DOT[s])} />
                    {STATUS_LABEL[s]}
                    {current && <CheckIcon className="ml-auto size-4" />}
                  </Menu.Item>
                );
              })}
              {row.status !== "PENDING" && (
                <>
                  <Menu.Separator className="my-1 h-px bg-border" />
                  <Menu.Item disabled={lockedInMorning} onClick={() => onReset(row)} className={item}>
                    <Undo2Icon className="size-3.5 text-muted-foreground" /> Volver a pendiente
                  </Menu.Item>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </span>
  );
}
