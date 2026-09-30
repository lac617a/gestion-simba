import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateReservation } from "@/app/actions/reservations";
import { APP_TIMEZONE } from "@/lib/config";
import { verifyReservations } from "@/lib/dal";
import { formatDayShort } from "@/lib/dates";
import { RESERVATION_STATUS_CLASS, RESERVATION_STATUS_LABEL, splitOccasion } from "@/lib/reservations";
import { getReservation, getReservationFormContext } from "@/lib/reservations-data";
import { displayName } from "@/lib/users";
import { cn } from "@/lib/utils";
import { ReservationForm } from "../reservation-form";
import { CancelOrDelete } from "./cancel-or-delete";

export const metadata: Metadata = { title: "Editar reserva · Gestión Simba" };

const createdAtFormat = new Intl.DateTimeFormat("es-CO", { timeZone: APP_TIMEZONE, dateStyle: "medium", timeStyle: "short" });

export default async function EditReservationPage({ params }: PageProps<"/gestion/reservas/[id]">) {
  await verifyReservations();
  const { id } = await params;
  const [r, context] = await Promise.all([getReservation(id), getReservationFormContext()]);
  if (!r) notFound();
  const occasion = splitOccasion(r.occasion);

  return (
    <div className="grid max-w-xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Editar reserva</h1>
        <span className={cn("rounded-md border px-1.5 text-xs", RESERVATION_STATUS_CLASS[r.status])}>
          {RESERVATION_STATUS_LABEL[r.status]}
        </span>
        <p className="w-full text-sm text-muted-foreground">
          Registrada {r.createdBy && `por ${displayName(r.createdBy)} `}el {createdAtFormat.format(r.createdAt)}
        </p>
      </div>
      <ReservationForm
        action={updateReservation.bind(null, r.id)}
        submitLabel="Guardar cambios"
        context={context}
        saved={{ date: r.date, time: r.time }}
        defaults={{
          date: r.date,
          time: r.time,
          partySize: String(r.partySize),
          customerName: r.customerName,
          phone: r.phone ?? "",
          occasionChoice: occasion.choice,
          occasionOther: occasion.other,
          honoree: r.honoree ?? "",
          note: r.note ?? "",
        }}
      />
      <CancelOrDelete id={r.id} status={r.status} label={`${r.customerName} · ${formatDayShort(r.date)}`} />
    </div>
  );
}
