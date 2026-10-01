import type { Metadata } from "next";
import { createReservation } from "@/app/actions/reservations";
import { verifyReservations } from "@/lib/dal";
import { getReservationFormContext } from "@/lib/reservations-data";
import { loadDay } from "@/lib/search-params";
import { ReservationForm } from "../reservation-form";

export const metadata: Metadata = { title: "Nueva reserva · Gestión Simba" };

export default async function NewReservationPage({ searchParams }: PageProps<"/gestion/reservas/nueva">) {
  await verifyReservations();
  const { fecha } = await loadDay(searchParams);
  const context = await getReservationFormContext();

  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-semibold">Nueva reserva</h1>
      <ReservationForm
        action={createReservation}
        submitLabel="Guardar reserva"
        context={context}
        defaults={{
          // Sin fechas pasadas: un enlace viejo con ?fecha= arranca en hoy.
          date: fecha && fecha >= context.today ? fecha : context.today,
          time: "",
          partySize: "2",
          customerName: "",
          phone: "",
          occasionChoice: "",
          occasionOther: "",
          honoree: "",
          note: "",
        }}
      />
    </div>
  );
}
