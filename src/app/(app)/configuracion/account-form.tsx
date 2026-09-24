"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateAccount } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD } from "@/lib/account";

export function AccountForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateAccount, undefined);
  const errors = state?.errors;

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    // key: remonta el form tras cada envío; las contraseñas quedan vacías y el correo con lo último enviado
    <form key={JSON.stringify(state ?? null)} action={action} className="grid gap-4">
      <Field id="email" label="Correo" error={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state?.email ?? currentEmail}
          aria-invalid={!!errors?.email}
          required
        />
      </Field>

      <Field
        id="newPassword"
        label="Contraseña nueva"
        hint={`Déjala vacía para no cambiarla. Mínimo ${MIN_PASSWORD} caracteres, con letras y números.`}
        error={errors?.newPassword}
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors?.newPassword} />
      </Field>

      <Field id="confirmPassword" label="Repite la contraseña nueva" error={errors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors?.confirmPassword}
        />
      </Field>

      <Field id="currentPassword" label="Contraseña actual *" error={errors?.currentPassword}>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors?.currentPassword}
          required
        />
      </Field>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" className="justify-self-start" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cuenta"}
      </Button>
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
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  );
}
