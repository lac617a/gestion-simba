import { createTimeOff } from "@/app/actions/time-off";
import { TIME_OFF_LABEL } from "@/lib/attendance";
import { today } from "@/lib/config";
import { db } from "@/lib/db";
import { dateToISO, daysBetween, formatShortDate, isoToDate } from "@/lib/dates";
import { DeleteTimeOffButton, TimeOffForm } from "./time-off-form";

/** Días libres vigentes y futuros del empleado + formulario para asignar más. */
export async function TimeOffSection({ employeeId }: { employeeId: string }) {
  const todayIso = today();
  const items = await db.timeOff.findMany({
    where: { employeeId, endDate: { gte: isoToDate(todayIso) } },
    orderBy: { startDate: "asc" },
  });

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Días libres asignados</h2>
        <p className="text-sm text-muted-foreground">
          Descansos extra o vacaciones por adelantado. Se aplican solos en la asistencia de esos días.
        </p>
      </div>

      {items.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {items.map((t) => {
            const start = dateToISO(t.startDate);
            const end = dateToISO(t.endDate);
            const days = daysBetween(start, end) + 1;
            return (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{TIME_OFF_LABEL[t.type]}</div>
                  <div className="text-muted-foreground">
                    {start === end ? formatShortDate(start) : `${formatShortDate(start)} – ${formatShortDate(end)}`}
                    {" · "}
                    {days} {days === 1 ? "día" : "días"}
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>
                <DeleteTimeOffButton id={t.id} />
              </li>
            );
          })}
        </ul>
      )}

      <TimeOffForm action={createTimeOff.bind(null, employeeId)} minDate={todayIso} />
    </section>
  );
}
