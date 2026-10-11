import type { Metadata } from "next";
import { verifyAdmin } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { DoubleShiftForm, OpeningHoursForm } from "../settings-forms";
import { Block, SettingsPage } from "../settings-ui";

export const metadata: Metadata = { title: "Horarios y turnos · Configuración · Gestión Simba" };

export default async function HoursSettingsPage() {
  await verifyAdmin();
  const settings = await getSettings();

  return (
    <SettingsPage section="horarios">
      <Block title="Horario de atención" description="A qué hora abre y cierra el restaurante cada día.">
        <OpeningHoursForm openingHours={settings.openingHours} />
      </Block>

      <Block title="Doble turno" description="Los días que se trabaja en dos turnos y el horario de cada uno.">
        <DoubleShiftForm weekdays={settings.doubleShiftWeekdays} shiftHours={settings.shiftHours} />
      </Block>
    </SettingsPage>
  );
}
