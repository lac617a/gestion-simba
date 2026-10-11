import type { Metadata } from "next";
import { formatMoment } from "@/components/history-timeline";
import { verifyAdmin } from "@/lib/dal";
import { emailConfigured } from "@/lib/resend";
import { getSettings } from "@/lib/settings";
import { BackupSettings } from "../backup-settings";
import { Block, SettingsPage } from "../settings-ui";

export const metadata: Metadata = { title: "Respaldos · Configuración · Gestión Simba" };

export default async function BackupSettingsPage() {
  await verifyAdmin();
  const settings = await getSettings();

  return (
    <SettingsPage section="respaldos">
      <Block
        title="Respaldo de los datos"
        description="Por si algo se daña: llega cada mañana por correo y también se puede bajar cuando quieras. Las contraseñas de los usuarios no van en el respaldo."
      >
        <BackupSettings
          email={settings.backupEmail}
          lastSent={settings.lastBackupAt && formatMoment(settings.lastBackupAt)}
          canEmail={emailConfigured()}
        />
      </Block>
    </SettingsPage>
  );
}
