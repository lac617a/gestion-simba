import { redirect } from "next/navigation";

// La pantalla "Hoy" llega en la Fase 4; por ahora el inicio es la asistencia del día.
export default function HomePage() {
  redirect("/asistencia");
}
