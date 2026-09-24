import Link from "next/link";
import { LogOutIcon } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4">
          <Link href="/" className="hidden font-semibold sm:inline">
            Simba
          </Link>
          <NavLinks />
          <form action={logout} className="ml-auto">
            <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión">
              <LogOutIcon />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
