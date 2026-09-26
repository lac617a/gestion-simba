import { redirect } from "next/navigation";

/** Mientras no exista la página pública, la raíz lleva a la administración. */
export default function Home() {
  redirect("/gestion");
}
