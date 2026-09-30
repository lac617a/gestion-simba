import type { Metadata } from "next";
import { createUser } from "@/app/actions/users";
import { verifyAdmin } from "@/lib/dal";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Nuevo usuario · Gestión Simba" };

export default async function NewUserPage() {
  await verifyAdmin();
  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-semibold">Nuevo usuario</h1>
      <UserForm
        action={createUser}
        mode="new"
        submitLabel="Crear usuario"
        defaults={{ name: "", email: "", role: "RESERVATIONS" }}
      />
    </div>
  );
}
