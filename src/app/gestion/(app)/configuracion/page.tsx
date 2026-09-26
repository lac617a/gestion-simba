import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_TIMEZONE, CURRENCY, DAY_CUTOFF_HOUR } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AccountForm } from "./account-form";
import { LogoutEverywhereButton } from "./logout-everywhere";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración · Gestión Simba" };

export default async function SettingsPage() {
  const session = await verifySession();
  const [user, settings] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true } }),
    getSettings(),
  ]);

  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>

      <Section title="Cuenta" description="Correo y contraseña para entrar. Siempre se pide la contraseña actual.">
        <AccountForm currentEmail={user.email} />
      </Section>

      <Section
        title="Sesiones"
        description="Si entraste desde un celular o computadora ajenos, o perdiste un dispositivo, cierra la sesión en todos los demás. Este seguirá conectado."
      >
        <LogoutEverywhereButton />
      </Section>

      <Section title="Página pública" description="Lo que ven los clientes en la página del restaurante.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/gestion/resenas" />} nativeButton={false}>
            <StarIcon /> Reseñas
          </Button>
          <Button variant="ghost" render={<a href="/" target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
            <ExternalLinkIcon /> Ver la página
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          El WhatsApp y el horario de la página se cambian abajo, en Restaurante.
        </p>
      </Section>

      <Section title="Restaurante" description="Afecta la asistencia, los pagos y los reportes.">
        <SettingsForm settings={settings} />
        <dl className="grid gap-1 border-t pt-4 text-sm">
          <Info label="Zona horaria" value={APP_TIMEZONE} />
          <Info label="Moneda" value={CURRENCY.code} />
          <Info label="Fin del día de trabajo" value={`${String(DAY_CUTOFF_HOUR).padStart(2, "0")}:00`} />
          <p className="text-xs text-muted-foreground">Estos tres se cambian en las variables de entorno de Vercel.</p>
        </dl>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
