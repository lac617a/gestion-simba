import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mensaje centrado de pantalla completa (error, no encontrado): ícono, título, explicación y botones. */
export function StatusScreen({
  icon: Icon,
  tone = "muted",
  title,
  children,
  actions,
  role,
}: {
  icon: LucideIcon;
  tone?: "muted" | "warning";
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  role?: "alert";
}) {
  return (
    <div role={role} className="mx-auto grid max-w-md justify-items-center gap-3 py-12 text-center">
      <span
        className={cn(
          "grid size-12 place-items-center rounded-full",
          tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-6" />
      </span>
      <h1 className="text-xl font-semibold text-balance">{title}</h1>
      <div className="grid gap-1 text-sm text-muted-foreground text-pretty">{children}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  );
}
