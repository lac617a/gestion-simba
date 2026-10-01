"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ArrowRightIcon, CheckCheckIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { markPendingAsWorked, resetAttendance, setAttendanceStatus } from "@/app/actions/attendance";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import type { DayRow } from "@/lib/workdays";

/** Chips que se ven por grupo antes de "+N más". */
const VISIBLE = 12;

type Group = { key: string; title: string; statuses: AttendanceStatus[]; bar: string };
const GROUPS: Group[] = [
  { key: "worked", title: "Trabajan", statuses: ["WORKED"], bar: "bg-emerald-500" },
  { key: "pending", title: "Pendientes", statuses: ["PENDING"], bar: "bg-amber-400" },
  { key: "resting", title: "Descansan", statuses: ["REST", "EXTRA_REST", "LEAVE"], bar: "bg-slate-300" },
  { key: "absent", title: "Faltaron", statuses: ["ABSENT"], bar: "bg-red-500" },
];

type Props = {
  date: string;
  rows: DayRow[];
  /** Día abierto: se puede marcar desde aquí */
  editable: boolean;
  /** Doble turno: hay que elegir el turno, así que se marca en Asistencia */
  doubleShift: boolean;
};

/**
 * Quién está hoy, en chips por estado. Tocar un pendiente lo marca "Trabajó"
 * (con Deshacer en el aviso).
 */
export function TodayPeople({ date, rows, editable, doubleShift }: Props) {
  const [statuses, setOptimistic] = useOptimistic(
    Object.fromEntries(rows.map((r) => [r.employeeId, r.status])) as Record<string, AttendanceStatus>,
    (state: Record<string, AttendanceStatus>, update: Record<string, AttendanceStatus>) => ({ ...state, ...update })
  );
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const canTap = editable && !doubleShift;

  const people = rows.map((r) => ({ ...r, status: statuses[r.employeeId] }));
  const byGroup = GROUPS.map((g) => ({ ...g, people: people.filter((p) => g.statuses.includes(p.status)) }));
  const pendingCount = byGroup.find((g) => g.key === "pending")!.people.length;
  const workingCount = byGroup.find((g) => g.key === "worked")!.people.length;

  function markWorked(row: DayRow) {
    if (!row.attendanceId) return;
    const attendanceId = row.attendanceId;
    startTransition(async () => {
      setOptimistic({ [row.employeeId]: "WORKED" });
      const res = await setAttendanceStatus(attendanceId, "WORKED");
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${row.name}: Trabajó`, {
        action: {
          label: "Deshacer",
          onClick: () =>
            startTransition(async () => {
              setOptimistic({ [row.employeeId]: "PENDING" });
              const undo = await resetAttendance(attendanceId);
              if (!undo.ok) toast.error(undo.error);
            }),
        },
      });
    });
  }

  function markAll() {
    const pending = people.filter((p) => p.status === "PENDING");
    startTransition(async () => {
      setOptimistic(Object.fromEntries(pending.map((p) => [p.employeeId, "WORKED" as const])));
      const res = await markPendingAsWorked(date);
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.count} marcados como “Trabajó”`);
    });
  }

  return (
    <section className="grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-semibold">Quién está hoy</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {rows.length} {rows.length === 1 ? "empleado" : "empleados"} · {workingCount} trabajan
          {pendingCount > 0 && ` · ${pendingCount} pendientes`}
        </span>
      </div>

      {/* Proporción de cada estado */}
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {byGroup.map((g) =>
          g.people.length ? (
            <div key={g.key} className={g.bar} style={{ width: `${(g.people.length / rows.length) * 100}%` }} />
          ) : null
        )}
      </div>

      <div className="divide-y">
        {byGroup
          .filter((g) => g.people.length > 0 || g.key === "worked")
          .map((g) => {
            const open = expanded[g.key];
            const shown = open ? g.people : g.people.slice(0, VISIBLE);
            const hidden = g.people.length - shown.length;
            return (
              <div key={g.key} className="grid gap-2 py-2.5 sm:grid-cols-[7.5rem_1fr]">
                <p className="text-sm text-muted-foreground">
                  <span className="mr-1.5 font-semibold text-foreground tabular-nums">{g.people.length}</span>
                  {g.title}
                </p>
                {g.people.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nadie marcado como “Trabajó” todavía.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {shown.map((p) => {
                      const chip = cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm",
                        STATUS_CHIP_CLASS[p.status],
                        p.status === "PENDING" && "border-dashed"
                      );
                      const suffix = g.key === "resting" ? ` · ${STATUS_LABEL[p.status]}` : "";
                      return (
                        <li key={p.employeeId}>
                          {p.status === "PENDING" && canTap ? (
                            <button
                              type="button"
                              onClick={() => markWorked(p)}
                              title="Marcar Trabajó"
                              className={cn(chip, "hover:border-solid hover:border-emerald-500")}
                            >
                              <CheckIcon className="size-3.5" /> {p.name}
                            </button>
                          ) : p.status === "PENDING" && editable ? (
                            <Link href="/gestion/asistencia" className={chip} title="Márcalo en Asistencia (elige el turno)">
                              {p.name}
                            </Link>
                          ) : (
                            <span className={chip} title={p.position ?? undefined}>
                              {p.name}
                              {suffix && <span className="text-xs opacity-75">{suffix}</span>}
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {(hidden > 0 || open) && g.people.length > VISIBLE && (
                      <li>
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => ({ ...e, [g.key]: !open }))}
                          className="rounded-full border px-2.5 py-0.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {open ? "Ver menos" : `+${hidden} más`}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
        {canTap && pendingCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheckIcon /> Marcar los {pendingCount} pendientes como Trabajó
          </Button>
        )}
        <Link
          href="/gestion/asistencia"
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Ir a Asistencia <ArrowRightIcon className="size-3.5" />
        </Link>
        {canTap && pendingCount > 0 && (
          <span className="text-xs text-muted-foreground">Toca un pendiente para marcarlo.</span>
        )}
      </div>
    </section>
  );
}
