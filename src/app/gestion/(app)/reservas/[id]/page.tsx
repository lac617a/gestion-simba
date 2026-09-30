import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MailIcon } from "lucide-react";
import { updateReservation } from "@/app/actions/reservations";
import { APP_TIMEZONE } from "@/lib/config";
import { verifyReservations } from "@/lib/dal";
import { formatDayShort, type ISODate } from "@/lib/dates";
import { planReminder } from "@/lib/reminders";
import { RESERVATION_STATUS_CLASS, RESERVATION_STATUS_LABEL, splitOccasion } from "@/lib/reservations";
import { getReservation, getReservationFormContext } from "@/lib/reservations-data";
import { emailConfigured } from "@/lib/resend";
import { getSettings } from "@/lib/settings";
import { displayName } from "@/lib/users";
import { cn } from "@/lib/utils";
import { ReservationForm } from "../reservation-form";
import { CancelOrDelete } from "./cancel-or-delete";

export const metadata: Metadata = { title: "Editar reserva · Gestión Simba" };

const createdAtFormat = new Intl.DateTimeFormat("es-CO", { timeZone: APP_TIMEZONE, dateStyle: "medium", timeStyle: "short" });

/** Estado del correo de 1 hora antes, para mostrarlo bajo el título. */
function reminderLabel(
  r: { status: Parameters<typeof planReminder>[0]["status"]; date: ISODate; time: string; reminderEmailId: string | null; reminderAt: Date | null },
  to: string
): string | null {
  if (!emailConfigured()) return "Recordatorio por correo: falta configurar Resend (RESEND_API_KEY).";
  if (!to) return null; // desactivado en Configuración
  const now = new Date();
  if (r.reminderEmailId && r.reminderAt) {
    return r.reminderAt > now
      ? `Recordatorio por correo a ${to}: sale el ${createdAtFormat.format(r.reminderAt)}`
      : `Recordatorio por correo enviado el ${createdAtFormat.format(r.reminderAt)}`;
  }
  const plan = planReminder(r, APP_TIMEZONE, now, true);
  if (plan.kind === "none") {
    return plan.reason === "too-far" ? "Recordatorio por correo: se programa solo cuando falten menos de 30 días." : null;
  }
  return "Recordatorio por correo: pendiente, se vuelve a intentar cada mañana.";
}

export default async function EditReservationPage({ params }: PageProps<"/gestion/reservas/[id]">) {
  await verifyReservations();
  const { id } = await params;
  const [r, context, settings] = await Promise.all([getReservation(id), getReservationFormContext(), getSettings()]);
  if (!r) notFound();
  const occasion = splitOccasion(r.occasion);
  const reminder = reminderLabel(r, settings.reminderEmail);

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
        {reminder && (
          <p className="-mt-2 flex w-full items-center gap-1.5 text-sm text-muted-foreground">
            <MailIcon className="size-3.5 shrink-0" /> {reminder}
          </p>
        )}
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
