"use client";

import { useTransition } from "react";
import { debounce, useQueryState } from "nuqs";
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

/**
 * Buscador que filtra mientras se escribe: cambia ?q= en la dirección (conserva
 * los demás parámetros) y el servidor vuelve a cargar la lista.
 */
export function SearchInput({ placeholder, label, className }: { placeholder: string; label: string; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useQueryState(
    "q",
    searchParam.q.withOptions({ shallow: false, limitUrlUpdates: debounce(350), startTransition })
  );

  return (
    <div className={cn("relative", className)} role="search">
      {pending ? (
        <LoaderCircleIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        type="search"
        value={q}
        onChange={(e) => void setQ(e.target.value || null)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 pr-10 pl-9 text-base [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          onClick={() => void setQ(null, { limitUrlUpdates: undefined })}
          aria-label="Quitar búsqueda"
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
