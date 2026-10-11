import type { Metadata } from "next";
import { verifyAdmin } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { HolidayWeeks } from "../holiday-weeks";
import { PayWeekForm } from "../settings-forms";
import { Block, SettingsPage } from "../settings-ui";

export const metadata: Metadata = { title: "Semana de pago · Configuración · Gestión Simba" };

export default async function PayWeekSettingsPage() {
  await verifyAdmin();
  const settings = await getSettings();

  return (
    <SettingsPage section="semana-de-pago">
      <Block title="Semana y día de pago" description="Afecta Pagos, Reportes, Hoy y Empleados.">
        <PayWeekForm payWeekStart={settings.payWeekStart} payDay={settings.payDay} />
      </Block>

      <Block
        title="Lunes festivos"
        description="Cuando el lunes es festivo, la semana de pago termina ese lunes y se paga el martes; la siguiente va de martes a domingo. Apaga un festivo si esa vez quieres la semana normal."
      >
        <HolidayWeeks settings={settings} />
        {(settings.payWeekStart !== 1 || settings.payDay !== 1) && (
          <p className="text-xs text-muted-foreground">
            Esta regla está pensada para la semana de lunes a domingo con pago el lunes. Con otra semana de pago, el festivo
            solo corre al martes el pago que caía ese lunes.
          </p>
        )}
      </Block>
    </SettingsPage>
  );
}
