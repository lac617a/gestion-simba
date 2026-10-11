"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  CircleUserIcon,
  ClockIcon,
  DatabaseBackupIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTINGS_HOME, SETTINGS_SECTIONS, settingsHref, type SettingsSlug } from "./sections";

const ICONS: Record<SettingsSlug, LucideIcon> = {
  cuenta: CircleUserIcon,
  restaurante: StoreIcon,
  horarios: ClockIcon,
  puestos: BriefcaseIcon,
  "semana-de-pago": WalletIcon,
  reservas: CalendarCheckIcon,
  respaldos: DatabaseBackupIcon,
};

/** Usuarios tiene sus propias pantallas (/gestion/usuarios); aquí solo se enlaza. */
const USERS = { href: "/gestion/usuarios", title: "Usuarios", description: "Quiénes entran a la administración y con qué permisos." };

/**
 * Menú de Configuración. `sidebar`: enlaces compactos al lado (computador), con
 * la sección abierta resaltada. `list`: filas grandes con descripción (celular).
 */
export function SettingsNav({ variant }: { variant: "sidebar" | "list" }) {
  const pathname = usePathname();
  // En computador, /gestion/configuracion muestra "Mi cuenta".
  const current = pathname === SETTINGS_HOME ? settingsHref("cuenta") : pathname;

  if (variant === "list") {
    return (
      <nav aria-label="Secciones de configuración">
        <ul className="divide-y rounded-lg border">
          {[...SETTINGS_SECTIONS.map((s) => ({ ...s, href: settingsHref(s.slug), icon: ICONS[s.slug] })), { ...USERS, icon: UsersIcon }].map(
            ({ href, title, description, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted-foreground">{description}</span>
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          )}
        </ul>
      </nav>
    );
  }

  const item = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground";
  return (
    <nav aria-label="Secciones de configuración" className="grid gap-0.5">
      {SETTINGS_SECTIONS.map((s) => {
        const href = settingsHref(s.slug);
        const Icon = ICONS[s.slug];
        const active = current === href;
        return (
          <Link
            key={s.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(item, active && "bg-muted font-medium text-foreground")}
          >
            <Icon className="size-4 shrink-0" /> {s.title}
          </Link>
        );
      })}
      <Link href={USERS.href} className={cn(item, "mt-2 border-t pt-3")}>
        <UsersIcon className="size-4 shrink-0" /> {USERS.title}
        <ChevronRightIcon className="ml-auto size-3.5" />
      </Link>
    </nav>
  );
}
