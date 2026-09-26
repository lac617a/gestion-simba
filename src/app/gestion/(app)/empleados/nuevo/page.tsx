import type { Metadata } from "next";
import { createEmployee } from "@/app/actions/employees";
import { verifySession } from "@/lib/dal";
import { EmployeeForm } from "../employee-form";

export const metadata: Metadata = { title: "Nuevo empleado · Gestión Simba" };

export default async function NewEmployeePage() {
  await verifySession();
  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-semibold">Nuevo empleado</h1>
      <EmployeeForm action={createEmployee} submitLabel="Registrar" />
    </div>
  );
}
