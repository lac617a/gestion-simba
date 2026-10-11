import type { Metadata } from "next";
import { verifyAdmin } from "@/lib/dal";
import { emailConfigured } from "@/lib/resend";
import { getSettings } from "@/lib/settings";
import { ReservationEmailsForm } from "../settings-forms";
import { Block, SettingsPage } from "../settings-ui";

export const metadata: Metadata = { title: "Reservas · Configuración · Gestión Simba" };

export default async function ReservationSettingsPage() {
  await verifyAdmin();
  const settings = await getSettings();

  return (
    <SettingsPage section="reservas">
      <Block title="Correos de las reservas">
        {!emailConfigured() && (
          <p className="text-sm text-amber-800">Falta configurar Resend (RESEND_API_KEY): por ahora no sale ningún correo.</p>
        )}
        <ReservationEmailsForm reminderEmail={settings.reminderEmail} calendarEmail={settings.calendarEmail} />
      </Block>
    </SettingsPage>
  );
}
