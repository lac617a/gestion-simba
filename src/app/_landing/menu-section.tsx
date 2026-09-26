import Image from "next/image";
import { DownloadIcon } from "lucide-react";
import { MENU, type MenuItem, type MenuSection } from "@/lib/menu";
import { formatPesos } from "@/lib/public-site";
import { cn } from "@/lib/utils";

/** Fotos recortadas de la carta, por sección. */
const SECTION_IMAGE: Record<string, { src: string; width: number; height: number; className: string }> = {
  perros: { src: "/landing/perro.webp", width: 352, height: 485, className: "w-28 sm:w-36" },
  parrilla: { src: "/landing/parrilla.webp", width: 900, height: 822, className: "w-44 sm:w-64" },
};

export function MenuSectionList() {
  return (
    <section id="menu" className="scroll-mt-16 bg-simba-cream text-simba-forest">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-6 sm:pt-20">
        <p className="text-sm font-semibold tracking-[0.2em] text-simba-rust uppercase">La carta</p>
        <h2 className="font-display text-4xl text-simba-rust sm:text-5xl">Nuestro menú</h2>
        <p className="mt-2 max-w-xl text-simba-forest/80">
          Carnes a la parrilla, hamburguesas y perros con nombre de la selva. Precios en pesos colombianos.
        </p>
      </div>

      {/* Atajos a cada sección (se queda arriba al bajar) */}
      <nav
        aria-label="Secciones del menú"
        className="sticky top-14 z-20 border-y border-simba-rust/15 bg-simba-cream/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none]">
          {MENU.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full border border-simba-rust/30 px-3.5 py-1.5 text-sm font-medium text-simba-rust transition-colors hover:bg-simba-rust hover:text-simba-cream"
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 sm:gap-16">
        {MENU.map((s) => (s.groups ? <GroupedSection key={s.id} section={s} /> : <Section key={s.id} section={s} />))}

        {/* Como en la carta impresa: los personajes cierran el menú, "parados" sobre la sección siguiente */}
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <a
            href="/menu-simba.pdf"
            download
            className="inline-flex items-center gap-2 self-start rounded-full border border-simba-rust px-5 py-2.5 text-sm font-semibold text-simba-rust transition-colors hover:bg-simba-rust hover:text-simba-cream sm:mb-12"
          >
            <DownloadIcon className="size-4" /> Descargar la carta en PDF
          </a>
          <Image
            src="/landing/personajes.webp"
            alt=""
            width={1314}
            height={456}
            className="block h-auto w-full max-w-md self-end sm:max-w-lg"
          />
        </div>
      </div>
    </section>
  );
}

function Section({ section: s }: { section: MenuSection }) {
  const dark = s.id === "parrilla"; // como en la carta: la parrilla va en fondo terracota
  const image = SECTION_IMAGE[s.id];
  const compact = s.items.every((i) => !i.description); // adicionales: solo nombre y precio

  return (
    <article
      id={s.id}
      className={cn("relative scroll-mt-32", dark && "rounded-3xl bg-simba-rust px-5 py-8 text-simba-cream sm:px-10 sm:py-10")}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className={cn("font-display text-3xl sm:text-4xl", dark ? "text-simba-gold" : "text-simba-rust")}>{s.title}</h3>
          {s.note && <p className={cn("mt-1 text-sm", dark ? "text-simba-cream/85" : "text-simba-forest/75")}>{s.note}</p>}
        </div>
        {image && (
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            className={cn("-mt-10 -mb-2 h-auto shrink-0 drop-shadow-xl", image.className)}
          />
        )}
      </div>
      <ul className={cn("mt-6 grid gap-x-10", compact ? "gap-y-2 sm:grid-cols-2 lg:grid-cols-3" : "gap-y-5 lg:grid-cols-2")}>
        {s.items.map((item) => (
          <Item key={item.name} item={item} dark={dark} />
        ))}
      </ul>
    </article>
  );
}

function GroupedSection({ section: s }: { section: MenuSection }) {
  return (
    <article id={s.id} className="scroll-mt-32">
      <div className="flex items-end justify-between gap-4">
        <h3 className="font-display text-3xl text-simba-rust sm:text-4xl">{s.title}</h3>
        <div className="-mb-2 flex items-end" aria-hidden>
          {[1, 2, 3].map((n) => (
            <Image key={n} src={`/landing/bebida-${n}.webp`} alt="" width={150} height={280} className="-ml-3 h-24 w-auto drop-shadow-lg sm:h-32" />
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {s.groups!.map((g) => (
          <div key={g.title}>
            <h4 className="font-display text-lg text-simba-forest">{g.title}</h4>
            {g.note && <p className="text-sm text-simba-forest/75">{g.note}</p>}
            <ul className="mt-2 grid gap-2">
              {g.items.map((item) => (
                <Item key={item.name} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}

function Item({ item, dark }: { item: MenuItem; dark?: boolean }) {
  return (
    <li>
      <div className="flex items-baseline gap-2">
        <span className={cn("font-bold uppercase", item.description ? "text-lg tracking-wide" : "text-[15px] normal-case")}>
          {item.name}
        </span>
        <span
          aria-hidden
          className={cn("min-w-4 flex-1 border-b-2 border-dotted", dark ? "border-simba-cream/40" : "border-simba-rust/35")}
        />
        <span
          className={cn(
            "shrink-0 rounded-md px-2 font-price tabular-nums",
            item.description ? "text-lg" : "text-[15px]",
            dark ? "bg-simba-cream text-simba-rust" : "bg-simba-rust text-simba-cream"
          )}
        >
          <span className="sr-only">$</span>
          {formatPesos(item.price)}
        </span>
      </div>
      {item.description && (
        <p className={cn("mt-1 text-[15px] leading-snug", dark ? "text-simba-cream/85" : "text-simba-forest/80")}>
          {item.description}
        </p>
      )}
    </li>
  );
}
