import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateEmployee } from "@/app/actions/employees";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { getPositionOptions } from "@/lib/job-positions-data";
import { EmployeeForm } from "../employee-form";
import { ActiveToggle } from "./active-toggle";
import { TimeOffSection } from "./time-off-section";

export const metadata: Metadata = { title: "Editar empleado · Gestión Simba" };

export default async function EditEmployeePage({ params }: PageProps<"/gestion/empleados/[id]">) {
  await verifySession();
  const { id } = await params;
  const [employee, positions] = await Promise.all([db.employee.findUnique({ where: { id } }), getPositionOptions()]);
  if (!employee) notFound();

  return (
    <div className="grid max-w-xl gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{employee.name}</h1>
        {!employee.active && <Badge variant="secondary">Baja</Badge>}
      </div>

      <EmployeeForm
        action={updateEmployee.bind(null, employee.id)}
        defaults={employee}
        positions={positions}
        submitLabel="Guardar cambios"
      />

      {employee.active && <TimeOffSection employeeId={employee.id} />}

      <section className="grid gap-3 rounded-lg border p-4">
        <h2 className="font-medium">{employee.active ? "Dar de baja" : "Reactivar"}</h2>
        <p className="text-sm text-muted-foreground">
          {employee.active
            ? "El empleado dejará de aparecer en la asistencia diaria. Su historial de asistencias y propinas se conserva."
            : "El empleado volverá a aparecer en la asistencia diaria."}
        </p>
        <ActiveToggle id={employee.id} name={employee.name} active={employee.active} />
      </section>
    </div>
  );
}
