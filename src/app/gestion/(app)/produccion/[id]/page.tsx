import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HistoryIcon } from "lucide-react";
import { updateProductionDay } from "@/app/actions/production";
import { formatMoment } from "@/components/history-timeline";
import { CURRENCY } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { formatLongDate } from "@/lib/dates";
import { getProductionCandidates, getProductionDay, getProductionLog } from "@/lib/production-data";
import { beforeHistory } from "@/lib/production-log";
import { getSettings } from "@/lib/settings";
import { ProductionForm } from "../production-form";
import { ProductionHistory } from "../production-history";
import { DeleteProductionButton } from "./delete-production";

export const metadata: Metadata = { title: "Editar jornada de producción · Gestión Simba" };

export default async function EditProductionPage({ params }: PageProps<"/gestion/produccion/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const day = await getProductionDay(id);
  if (!day) notFound();
  const [candidates, settings, history] = await Promise.all([
    getProductionCandidates(day.attendees.map((a) => a.employeeId)),
    getSettings(),
    getProductionLog(id),
  ]);
  const created = history.findLast((e) => e.action === "CREATED");

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Editar jornada de producción</h1>
        {created && (
          <p className="text-sm text-muted-foreground">
            Registrada {created.user && `por ${created.user} `}el {formatMoment(created.at)}
            {beforeHistory(created) && " (antes del historial)"}
          </p>
        )}
      </div>
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
      <section className="grid gap-3 border-t pt-5">
        <h2 className="flex items-center gap-2 font-medium">
          <HistoryIcon className="size-4 text-muted-foreground" /> Historial de cambios
        </h2>
        <ProductionHistory entries={history} />
      </section>
    </div>
  );
}
