import type { Metadata } from "next";
import { createProductionDay } from "@/app/actions/production";
import { CURRENCY, today } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { getProductionCandidates } from "@/lib/production-data";
import { getSettings } from "@/lib/settings";
import { ProductionForm } from "../production-form";

export const metadata: Metadata = { title: "Nueva jornada de producción · Gestión Simba" };

export default async function NewProductionPage() {
  await verifyAdmin();
  const [candidates, settings] = await Promise.all([getProductionCandidates(), getSettings()]);
  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Nueva jornada de producción</h1>
      <ProductionForm
        action={createProductionDay}
        currency={CURRENCY}
        candidates={candidates}
        productionPay={settings.productionPay}
        savedBasePay={{}}
        defaults={{ date: today(), note: "", attendees: {} }}
        submitLabel="Registrar jornada"
      />
    </div>
  );
}
