import type { Metadata } from "next";
import { createReservation } from "@/app/actions/reservations";
import { today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { isISODate } from "@/lib/dates";
import { ReservationForm } from "../reservation-form";

export const metadata: Metadata = { title: "Nueva reserva · Gestión Simba" };

export default async function NewReservationPage({ searchParams }: PageProps<"/reservas/nueva">) {
  await verifySession();
  const { fecha } = await searchParams;

  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-semibold">Nueva reserva</h1>
      <ReservationForm
        action={createReservation}
        submitLabel="Guardar reserva"
        autoFocus
        defaults={{
          date: isISODate(fecha) ? fecha : today(),
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
