import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateUser } from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";
import { verifyAdmin } from "@/lib/dal";
import { displayName } from "@/lib/users";
import { getUser } from "@/lib/users-data";
import { UserForm } from "../user-form";
import { ToggleActive } from "./toggle-active";

export const metadata: Metadata = { title: "Editar usuario · Gestión Simba" };

export default async function EditUserPage({ params }: PageProps<"/gestion/usuarios/[id]">) {
  const me = await verifyAdmin();
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();
  const self = user.id === me.userId;

  return (
    <div className="grid max-w-xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Editar usuario</h1>
        {self && <Badge variant="outline">Tú</Badge>}
        {!user.active && <Badge variant="destructive">Desactivado</Badge>}
      </div>
      <UserForm
        action={updateUser.bind(null, user.id)}
        mode="edit"
        self={self}
        submitLabel="Guardar cambios"
        defaults={{ name: user.name ?? "", email: user.email, role: user.role }}
      />
      {!self && <ToggleActive id={user.id} active={user.active} name={displayName(user)} />}
    </div>
  );
}
