import type { Metadata } from "next";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { FlashToast } from "@/components/flash-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verifyAdmin } from "@/lib/dal";
import { displayName, ROLE_DESCRIPTION, ROLE_LABEL, ROLES } from "@/lib/users";
import { getUsers } from "@/lib/users-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuarios · Gestión Simba" };

/** Quiénes pueden entrar a la administración y qué pueden hacer. */
export default async function UsersPage({ searchParams }: PageProps<"/gestion/usuarios">) {
  const me = await verifyAdmin();
  const params = await searchParams;
  const users = await getUsers();

  const flash = params.creado ? "Usuario creado" : params.actualizado ? "Cambios guardados" : null;

  return (
    <div className="grid max-w-2xl gap-6">
      {flash && <FlashToast message={flash} />}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Quiénes pueden entrar a la administración.</p>
        </div>
        <Button render={<Link href="/gestion/usuarios/nuevo" />} nativeButton={false} size="lg">
          <PlusIcon />
          Nuevo
        </Button>
      </div>

      <ul className="divide-y rounded-lg border">
        {users.map((u) => (
          <li key={u.id} className={cn("flex items-center justify-between gap-3 px-4 py-3", !u.active && "bg-muted/40")}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("truncate font-medium", !u.active && "text-muted-foreground")}>{displayName(u)}</span>
                <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{ROLE_LABEL[u.role]}</Badge>
                {u.id === me.userId && <Badge variant="outline">Tú</Badge>}
                {!u.active && <Badge variant="destructive">Desactivado</Badge>}
              </div>
              {u.name && <p className="truncate text-sm text-muted-foreground">{u.email}</p>}
            </div>
            <Button variant="ghost" size="sm" render={<Link href={`/gestion/usuarios/${u.id}`} />} nativeButton={false}>
              <PencilIcon /> Editar
            </Button>
          </li>
        ))}
      </ul>

      <dl className="grid gap-2 text-sm">
        {ROLES.map((r) => (
          <div key={r}>
            <dt className="inline font-medium">{ROLE_LABEL[r]}: </dt>
            <dd className="inline text-muted-foreground">{ROLE_DESCRIPTION[r]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
