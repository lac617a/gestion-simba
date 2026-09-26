import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 5 estrellas con relleno parcial (4,6 → 4 llenas y 60 % de la quinta). */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={`${value.toLocaleString("es-CO")} de 5 estrellas`} className={cn("inline-flex", className)}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block size-[1em]">
            <StarIcon className="absolute inset-0 size-full fill-current opacity-25" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className="size-[1em] fill-current" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
