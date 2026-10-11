import type { SessionUser } from "@/lib/dal";
import { displayName, ROLE_LABEL } from "@/lib/users";
import { AccountForm } from "./account-form";
import { LogoutEverywhereButton } from "./logout-everywhere";
import { Block, SettingsPage } from "./settings-ui";

/** "Mi cuenta": correo y contraseña del usuario que entró, y cerrar sus otras sesiones. */
export function AccountSection({ user, back = true }: { user: SessionUser; back?: boolean }) {
  return (
    <SettingsPage section="cuenta" back={back}>
      <Block
        title="Cuenta"
        description={`Entras como ${displayName(user)} (${ROLE_LABEL[user.role]}). Para cambiar el correo o la contraseña siempre se pide la contraseña actual.`}
      >
        <AccountForm currentEmail={user.email} />
      </Block>

      <Block
        title="Sesiones"
        description="Si entraste desde un celular o computadora ajenos, o perdiste un dispositivo, cierra la sesión en todos los demás. Este seguirá conectado."
      >
        <LogoutEverywhereButton />
      </Block>
    </SettingsPage>
  );
}
