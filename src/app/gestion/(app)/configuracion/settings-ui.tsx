import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { SETTINGS_HOME, settingsSection, type SettingsSlug } from "./sections";

/**
 * Una pantalla de Configuración: título y descripción de la sección y, en el
 * celular, el enlace para volver a la lista (en computador está el menú lateral).
 */
export function SettingsPage({
  section,
  back = true,
  children,
}: {
  section: SettingsSlug;
  /** Enlace "‹ Configuración" en el celular (los usuarios que solo tienen "Mi cuenta" no lo necesitan) */
  back?: boolean;
  children: React.ReactNode;
}) {
  const { title, description } = settingsSection(section);
  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-1">
        {back && (
          <Link
            href={SETTINGS_HOME}
            className="-ml-1 inline-flex items-center gap-0.5 justify-self-start text-sm text-muted-foreground hover:text-foreground md:hidden"
          >
            <ChevronLeftIcon className="size-4" /> Configuración
          </Link>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Un bloque dentro de una pantalla de Configuración. */
export function Block({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
