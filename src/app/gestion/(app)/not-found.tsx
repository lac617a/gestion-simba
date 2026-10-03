import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";

/** Un registro que ya no existe (ej. un enlace a una reserva eliminada). */
export default function AppNotFound() {
  return (
    <StatusScreen
      icon={SearchXIcon}
      title="No encontramos lo que buscas"
      actions={
        <Button size="lg" render={<Link href="/gestion" />} nativeButton={false}>
          Ir al inicio
        </Button>
      }
    >
      <p>Puede que se haya eliminado o que el enlace esté incompleto.</p>
    </StatusScreen>
  );
}
