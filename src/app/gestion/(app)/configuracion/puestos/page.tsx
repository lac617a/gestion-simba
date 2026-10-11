import type { Metadata } from "next";
import { CURRENCY } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { getJobPositions } from "@/lib/job-positions-data";
import { getSettings } from "@/lib/settings";
import { JobPositionsForm } from "../job-positions-form";
import { ProductionPayForm } from "../production-pay-form";
import { Block, SettingsPage } from "../settings-ui";

export const metadata: Metadata = { title: "Puestos y pago diario · Configuración · Gestión Simba" };

export default async function PositionsSettingsPage() {
  await verifyAdmin();
  const [settings, positions] = await Promise.all([getSettings(), getJobPositions()]);

  return (
    <SettingsPage section="puestos">
      <Block
        title="Puestos"
        description="Los puestos que se eligen al registrar un empleado y lo que se le paga por día trabajado."
      >
        <JobPositionsForm positions={positions} currency={CURRENCY} />
      </Block>

      <Block title="Producción" description="Lo que cobra cada empleado por asistir a una jornada de producción.">
        <ProductionPayForm amount={settings.productionPay} currency={CURRENCY} />
      </Block>
    </SettingsPage>
  );
}
