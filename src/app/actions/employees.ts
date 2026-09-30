"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import { verifyAdmin } from "@/lib/dal";
import { parseEmployeeForm, type EmployeeFieldErrors } from "@/lib/employees";

export type EmployeeFormValues = {
  name: string;
  jobPositionId: string;
  phone: string;
  hireDate: string;
  restDays: number[];
};

export type EmployeeFormState =
  | { errors?: EmployeeFieldErrors; message?: string; values?: EmployeeFormValues }
  | undefined;

/** Lo enviado, para volver a mostrarlo si hay error (React vacía el form tras la acción). */
function submittedValues(formData: FormData): EmployeeFormValues {
  const get = (k: string) => String(formData.get(k) ?? "");
  return {
    name: get("name"),
    jobPositionId: get("jobPositionId"),
    phone: get("phone"),
    hireDate: get("hireDate"),
    restDays: formData.getAll("restDays").map(Number),
  };
}

async function positionExists(id: string) {
  return (await db.jobPosition.count({ where: { id } })) > 0;
}

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await verifyAdmin();
  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  if (!(await positionExists(parsed.data.jobPositionId))) {
    return { errors: { jobPositionId: ["Ese puesto ya no existe"] }, values: submittedValues(formData) };
  }
  await db.employee.create({ data: parsed.data });
  revalidatePath("/gestion/empleados");
  redirect("/gestion/empleados?creado=1");
}

export async function updateEmployee(
  id: string,
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await verifyAdmin();
  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submittedValues(formData) };
  }

  if (!(await positionExists(parsed.data.jobPositionId))) {
    return { errors: { jobPositionId: ["Ese puesto ya no existe"] }, values: submittedValues(formData) };
  }
  const { count } = await db.employee.updateMany({ where: { id }, data: parsed.data });
  if (count === 0) return { message: "El empleado ya no existe", values: submittedValues(formData) };

  revalidatePath("/gestion/empleados");
  redirect("/gestion/empleados?actualizado=1");
}

/** Baja lógica / reactivación. Nunca se borra el registro para conservar el historial. */
export async function setEmployeeActive(id: string, active: boolean) {
  await verifyAdmin();
  await db.employee.updateMany({ where: { id }, data: { active } });
  revalidatePath("/gestion/empleados");
  revalidatePath(`/gestion/empleados/${id}`);
}
