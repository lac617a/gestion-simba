import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_TIMEZONE, CURRENCY, DAY_CUTOFF_HOUR } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { settingsHref } from "../sections";
import { WhatsappForm } from "../settings-forms";
import { Block, Info, SettingsPage } from "../settings-ui";

export const metadata: Metadata = { title: "Restaurante · Configuración · Gestión Simba" };

export default async function RestaurantSettingsPage() {
  await verifyAdmin();
  const settings = await getSettings();

  return (
    <SettingsPage section="restaurante">
      <Block title="WhatsApp">
        <WhatsappForm whatsapp={settings.whatsapp} />
      </Block>

      <Block title="Página pública" description="Lo que ven los clientes en la página del restaurante.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/gestion/resenas" />} nativeButton={false}>
            <StarIcon /> Reseñas
          </Button>
          <Button variant="ghost" render={<a href="/" target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
            <ExternalLinkIcon /> Ver la página
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          La página usa el WhatsApp de arriba y el horario de{" "}
          <Link href={settingsHref("horarios")} className="underline underline-offset-4">
            Horarios y turnos
          </Link>
          .
        </p>
      </Block>

      <Block title="Datos fijos" description="Se cambian en las variables de entorno de Vercel.">
        <dl className="grid gap-1 text-sm">
          <Info label="Zona horaria" value={APP_TIMEZONE} />
          <Info label="Moneda" value={CURRENCY.code} />
          <Info label="Fin del día de trabajo" value={`${String(DAY_CUTOFF_HOUR).padStart(2, "0")}:00`} />
        </dl>
      </Block>
    </SettingsPage>
  );
}
