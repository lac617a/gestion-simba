"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumnIcon, ClipboardCheckIcon, HouseIcon, UsersIcon, WalletIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Hoy", icon: HouseIcon },
  { href: "/asistencia", label: "Asistencia", icon: ClipboardCheckIcon },
  { href: "/pagos", label: "Pagos", icon: WalletIcon },
  { href: "/reportes", label: "Reportes", icon: ChartColumnIcon },
  { href: "/empleados", label: "Empleados", icon: UsersIcon },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Navegación superior (pantallas medianas en adelante). */
export function NavLinks() {
  const isActive = useIsActive();
  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground",
            isActive(link.href) && "bg-muted text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior con íconos (celular). */
export function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      aria-label="Navegación principal"
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
              active && "text-foreground"
            )}
          >
            <Icon className={cn("size-5", active && "stroke-[2.5]")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
