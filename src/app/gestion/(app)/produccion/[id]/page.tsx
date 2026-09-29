import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateProductionDay } from "@/app/actions/production";
import { CURRENCY } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { formatLongDate } from "@/lib/dates";
import { getProductionCandidates, getProductionDay } from "@/lib/production-data";
import { getSettings } from "@/lib/settings";
import { ProductionForm } from "../production-form";
import { DeleteProductionButton } from "./delete-production";

export const metadata: Metadata = { title: "Editar jornada de producción · Gestión Simba" };

export default async function EditProductionPage({ params }: PageProps<"/gestion/produccion/[id]">) {
  await verifySession();
  const { id } = await params;
  const day = await getProductionDay(id);
  if (!day) notFound();
  const [candidates, settings] = await Promise.all([
    getProductionCandidates(day.attendees.map((a) => a.employeeId)),
    getSettings(),
  ]);

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Editar jornada de producción</h1>
      <ProductionForm
        action={updateProductionDay.bind(null, day.id)}
        currency={CURRENCY}
        candidates={candidates}
        productionPay={settings.productionPay}
        savedBasePay={Object.fromEntries(day.attendees.map((a) => [a.employeeId, a.basePay]))}
        defaults={{
          date: day.date,
          note: day.note ?? "",
          attendees: Object.fromEntries(day.attendees.map((a) => [a.employeeId, a.extraPay])),
        }}
        submitLabel="Guardar cambios"
      />
      <div className="border-t pt-5">
        <DeleteProductionButton id={day.id} label={formatLongDate(day.date)} />
      </div>
    </div>
  );
}
