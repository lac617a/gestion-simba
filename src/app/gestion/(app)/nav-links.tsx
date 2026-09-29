"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  CalendarDaysIcon,
  ChartColumnIcon,
  ChefHatIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  EllipsisIcon,
  HouseIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: LucideIcon };

/** Las de todos los días: siempre a la vista. */
const PRIMARY: NavLink[] = [
  { href: "/gestion", label: "Hoy", icon: HouseIcon },
  { href: "/gestion/asistencia", label: "Asistencia", icon: ClipboardCheckIcon },
  { href: "/gestion/reservas", label: "Reservas", icon: CalendarDaysIcon },
];

/** Las demás: en celular (y pantallas medianas) quedan dentro de "Más". */
const SECONDARY: NavLink[] = [
  { href: "/gestion/produccion", label: "Producción", icon: ChefHatIcon },
  { href: "/gestion/pagos", label: "Pagos", icon: WalletIcon },
  { href: "/gestion/reportes", label: "Reportes", icon: ChartColumnIcon },
  { href: "/gestion/empleados", label: "Empleados", icon: UsersIcon },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/gestion" ? pathname === "/gestion" : pathname.startsWith(href));
}

/** Menú "Más" con las rutas secundarias. */
function MoreMenu({
  side,
  trigger,
  triggerClassName,
}: {
  side: "top" | "bottom";
  trigger: React.ReactNode;
  triggerClassName: string;
}) {
  const isActive = useIsActive();
  return (
    <Menu.Root>
      <Menu.Trigger className={triggerClassName}>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side={side} align="end" sideOffset={8} className="z-50 outline-none">
          <Menu.Popup className="min-w-52 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            {SECONDARY.map(({ href, label, icon: Icon }) => (
              <Menu.LinkItem
                key={href}
                closeOnClick
                render={<Link href={href} />}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-muted",
                  isActive(href) && "font-medium text-foreground"
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Navegación superior (pantallas medianas en adelante). */
export function NavLinks() {
  const isActive = useIsActive();
  const activeSecondary = SECONDARY.find((l) => isActive(l.href));
  const secondaryActive = !!activeSecondary;
  const linkClass = (active: boolean) =>
    cn("rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground", active && "bg-muted text-foreground");

  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {PRIMARY.map((link) => (
        <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={linkClass(isActive(link.href))}>
          {link.label}
        </Link>
      ))}
      {/* Pantallas anchas: todo a la vista */}
      {SECONDARY.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={cn(linkClass(isActive(link.href)), "hidden lg:inline-block")}
        >
          {link.label}
        </Link>
      ))}
      {/* Pantallas medianas: las secundarias en "Más" */}
      <span className="lg:hidden">
        <MoreMenu
          side="bottom"
          triggerClassName={cn(linkClass(secondaryActive), "inline-flex items-center gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50")}
          trigger={
            <>
              {activeSecondary?.label ?? "Más"} <ChevronDownIcon className="size-3.5" />
            </>
          }
        />
      </span>
    </nav>
  );
}

/** Barra inferior con íconos (celular): Hoy, Asistencia, Reservas y "Más". */
export function BottomNav() {
  const isActive = useIsActive();
  const secondaryActive = SECONDARY.some((l) => isActive(l.href));
  const item = (active: boolean) =>
    cn("flex min-w-0 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground", active && "text-foreground");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      aria-label="Navegación principal"
    >
      {PRIMARY.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={item(active)}>
            <Icon className={cn("size-5", active && "stroke-[2.5]")} />
            {label}
          </Link>
        );
      })}
      <MoreMenu
        side="top"
        triggerClassName={cn(item(secondaryActive), "w-full outline-none")}
        trigger={
          <>
            <EllipsisIcon className={cn("size-5", secondaryActive && "stroke-[2.5]")} />
            {secondaryActive ? SECONDARY.find((l) => isActive(l.href))!.label : "Más"}
          </>
        }
      />
    </nav>
  );
}
