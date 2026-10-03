import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { CalendarDaysIcon, UserPenIcon } from "lucide-react";
import { updateEmployee } from "@/app/actions/employees";
import { Badge } from "@/components/ui/badge";
import { ViewTabs } from "@/components/view-tabs";
import { db } from "@/lib/db";
import { verifyAdmin } from "@/lib/dal";
import { dateToISO, formatShortDate } from "@/lib/dates";
import { formatRestDays } from "@/lib/employees";
import { getPositionOptions } from "@/lib/job-positions-data";
import { employeeProfileHref, loadEmployeeProfile, type EmployeeProfileView } from "@/lib/search-params";
import { EmployeeForm } from "../employee-form";
import { ActiveToggle } from "./active-toggle";
import { EmployeeHistory } from "./employee-history";
import { TimeOffSection } from "./time-off-section";

const getEmployee = cache((id: string) =>
  db.employee.findUnique({ where: { id }, include: { jobPosition: { select: { name: true } } } })
);

export async function generateMetadata({ params }: PageProps<"/gestion/empleados/[id]">): Promise<Metadata> {
  await verifyAdmin();
  const employee = await getEmployee((await params).id);
  return { title: `${employee?.name ?? "Empleado"} · Gestión Simba` };
}

/** Ficha del empleado: su historial por semana de pago (asistencia, lo ganado y los pagos) y sus datos. */
export default async function EmployeePage({ params, searchParams }: PageProps<"/gestion/empleados/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const [employee, { ver, semana }] = await Promise.all([getEmployee(id), loadEmployeeProfile(searchParams)]);
  if (!employee) notFound();

  const tabHref = (view: EmployeeProfileView) => employeeProfileHref(`/gestion/empleados/${id}`, { ver: view, semana });
  const details = [
    employee.jobPosition?.name,
    employee.restDays.length ? `Descansa: ${formatRestDays(employee.restDays)}` : "Sin descanso fijo",
    employee.hireDate && `Desde el ${formatShortDate(dateToISO(employee.hireDate))}`,
  ].filter(Boolean);

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{employee.name}</h1>
          {!employee.active && <Badge variant="secondary">Baja</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
      </div>

      <ViewTabs
        label="Qué ver"
        current={ver}
        tabs={[
          { key: "historial", label: "Historial", icon: CalendarDaysIcon, href: tabHref("historial") },
          { key: "datos", label: "Datos", icon: UserPenIcon, href: tabHref("datos") },
        ]}
      />

      {ver === "historial" ? (
        <EmployeeHistory employee={employee} date={semana} />
      ) : (
        <EmployeeData employee={employee} />
      )}
    </div>
  );
}

/** Datos: editar, días libres asignados y dar de baja / reactivar. */
async function EmployeeData({ employee }: { employee: NonNullable<Awaited<ReturnType<typeof getEmployee>>> }) {
  const positions = await getPositionOptions();
  return (
    <div className="grid max-w-xl gap-6">
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
