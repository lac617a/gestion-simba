import type { Metadata } from "next";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND_LOGO } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Gestión Simba" };

export default function LoginPage() {
  return (
    // Fondo con el verde del logo (BRAND_GREEN)
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-[#022813] p-4">
      <Image src={BRAND_LOGO} alt="Simba" width={120} height={120} className="rounded-2xl" priority />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Gestión Simba</CardTitle>
          <CardDescription>Entra con tu cuenta de administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
