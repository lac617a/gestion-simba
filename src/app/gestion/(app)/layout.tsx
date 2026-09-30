import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO } from "@/lib/brand";
import { CircleUserIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { verifyUser } from "@/lib/dal";
import { homeFor } from "@/lib/users";
import { cn } from "@/lib/utils";
import { BottomNav, NavLinks } from "./nav-links";

// El layout solo usa el rol para armar el menú; cada página verifica su propio acceso.
export default async function AppLayout({ children }: LayoutProps<"/gestion">) {
  const { role } = await verifyUser();
  const admin = role === "ADMIN";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href={homeFor(role)} className="flex shrink-0 items-center gap-2 font-semibold" aria-label="Simba — inicio">
            <Image src={BRAND_LOGO} alt="" width={32} height={32} className="rounded-md" priority />
            <span className="hidden md:inline">Simba</span>
          </Link>
          <NavLinks role={role} />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-label={admin ? "Configuración" : "Mi cuenta"}
            render={<Link href="/gestion/configuracion" />}
            nativeButton={false}
          >
            {admin ? <SettingsIcon /> : <CircleUserIcon />}
            <span className="hidden sm:inline">{admin ? "Configuración" : "Mi cuenta"}</span>
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión">
              <LogOutIcon />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </form>
        </div>
      </header>
      {/* pb-24 en celular: deja espacio para la barra inferior (solo administradores la tienen) */}
      <main className={cn("mx-auto w-full max-w-5xl flex-1 px-4 pt-6 sm:pb-6", admin ? "pb-24" : "pb-6")}>{children}</main>
      <BottomNav role={role} />
    </div>
  );
}
