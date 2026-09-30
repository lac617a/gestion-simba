"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { UserFormState, UserFormValues } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD } from "@/lib/account";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES } from "@/lib/users";
import { cn } from "@/lib/utils";

type Props = {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  defaults: UserFormValues;
  mode: "new" | "edit";
  /** Editándose a sí mismo: solo el nombre (correo y contraseña van en Configuración → Cuenta) */
  self?: boolean;
  submitLabel: string;
};

export function UserForm({ action, defaults, mode, self = false, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  // Editándose a sí mismo, correo y rol no se envían (van deshabilitados): se muestran los guardados.
  const values = { ...(state?.values ?? defaults), ...(self && { email: defaults.email, role: defaults.role }) };

  return (
    // key: tras un error se remonta con lo enviado (React vacía el form tras la acción; las contraseñas quedan vacías)
    <form key={JSON.stringify(state?.values ?? null)} action={formAction} className="grid gap-5">
      <Field id="name" label="Nombre *" error={errors?.name}>
        <Input id="name" name="name" defaultValue={values.name} maxLength={40} placeholder="Ej. Laura" aria-invalid={!!errors?.name} required />
      </Field>

      <Field
        id="email"
        label="Correo *"
        hint={self ? "Tu correo y tu contraseña se cambian en Configuración → Cuenta." : "Con este correo entra a la administración."}
        error={errors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={values.email}
          aria-invalid={!!errors?.email}
          disabled={self}
          required
        />
      </Field>

      <fieldset className="grid gap-2" disabled={self}>
        <legend className="mb-2 text-sm font-medium">Rol *</legend>
        {ROLES.map((r) => (
          <label
            key={r}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/5",
              self && "cursor-not-allowed opacity-70"
            )}
          >
            <input type="radio" name="role" value={r} defaultChecked={values.role === r} className="mt-1 size-4 accent-primary" required />
            <span>
              <span className="block text-sm font-medium">{ROLE_LABEL[r]}</span>
              <span className="block text-sm text-muted-foreground">{ROLE_DESCRIPTION[r]}</span>
            </span>
          </label>
        ))}
        {self && <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>}
        {errors?.role && <p className="text-sm text-destructive">{errors.role[0]}</p>}
      </fieldset>

      {!self && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="password"
            label={mode === "new" ? "Contraseña *" : "Contraseña nueva"}
            hint={
              mode === "new"
                ? `Mínimo ${MIN_PASSWORD} caracteres, con letras y números. Compártela con la persona; luego la puede cambiar en Mi cuenta.`
                : "Déjala vacía para no cambiarla. Si la cambias, se cierra su sesión en todos lados."
            }
            error={errors?.password}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors?.password}
              required={mode === "new"}
            />
          </Field>
          <Field id="confirmPassword" label="Repite la contraseña" error={errors?.confirmPassword}>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors?.confirmPassword}
              required={mode === "new"}
            />
          </Field>
        </div>
      )}

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/gestion/usuarios" />} nativeButton={false}>
          Volver
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  );
}
