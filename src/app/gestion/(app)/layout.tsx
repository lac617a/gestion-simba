import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO } from "@/lib/brand";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { BottomNav, NavLinks } from "./nav-links";

export default function AppLayout({ children }: LayoutProps<"/gestion">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href="/gestion" className="flex shrink-0 items-center gap-2 font-semibold" aria-label="Simba — inicio">
            <Image src={BRAND_LOGO} alt="" width={32} height={32} className="rounded-md" priority />
            <span className="hidden md:inline">Simba</span>
          </Link>
          <NavLinks />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-label="Configuración"
            render={<Link href="/gestion/configuracion" />}
            nativeButton={false}
          >
            <SettingsIcon />
            <span className="hidden sm:inline">Configuración</span>
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión">
              <LogOutIcon />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </form>
        </div>
      </header>
      {/* pb-24 en celular: deja espacio para la barra inferior */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:pb-6">{children}</main>
      <BottomNav />
    </div>
  );
}
