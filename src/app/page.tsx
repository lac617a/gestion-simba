import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CameraIcon, ClockIcon, MapPinIcon, MessageCircleIcon, NavigationIcon, UtensilsIcon } from "lucide-react";
import { BRAND_LOGO } from "@/lib/brand";
import { PHONE_COUNTRY_CODE, today } from "@/lib/config";
import { formatHours, hoursFor } from "@/lib/hours";
import {
  holidayHours,
  MAPS_DIRECTIONS_URL,
  MAPS_EMBED_URL,
  orderMessage,
  SITE,
  weeklyHours,
} from "@/lib/public-site";
import { whatsappHref, whatsappNumber } from "@/lib/reservations";
import { getSchedule } from "@/lib/schedule-data";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { alfaSlab, bree } from "./_landing/fonts";
import { MenuSectionList } from "./_landing/menu-section";
import { ReserveForm } from "./_landing/reserve-form";

// Página estática que se regenera cada 10 minutos (el "hoy abrimos…" cambia a medianoche)
// y al guardar Configuración o una excepción de apertura.
export const revalidate = 600;

const TITLE = "Simba · Parrilla y hamburguesas en Piedecuesta";
const DESCRIPTION = `${SITE.tagline}. ${SITE.specialties.join(", ")}. ${SITE.address}, ${SITE.city}. Reservas y pedidos por WhatsApp.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "es_CO",
    siteName: SITE.name,
    images: [{ url: "/landing/og.jpg", width: 1200, height: 630, alt: "Carne a la parrilla de Simba" }],
  },
};

export default async function HomePage() {
  const settings = await getSettings();
  const date = today();
  const schedule = await getSchedule(date);
  const todayHours = hoursFor(schedule, settings.openingHours);
  const wa = whatsappNumber(settings.whatsapp, PHONE_COUNTRY_CODE);
  const orderHref = wa ? whatsappHref(wa, orderMessage(SITE.name)) : null;
  const week = weeklyHours(settings.openingHours, settings.closedWeekdays);
  const holiday = holidayHours(settings.openingHours);
  const hasHours = week.some((r) => r.hours);

  const todayLabel = !schedule.open
    ? "Hoy estamos cerrados"
    : todayHours
      ? `Hoy abrimos de ${formatHours(todayHours)}`
      : "Hoy abrimos";

  return (
    <div className={cn(alfaSlab.variable, bree.variable, "bg-simba-forest text-simba-cream")}>
      <JsonLd whatsapp={wa} openingHours={settings.openingHours} closedWeekdays={settings.closedWeekdays} />

      {/* ---------- Barra superior ---------- */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-simba-green/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <a href="#inicio" className="flex items-center gap-2" aria-label="Simba — inicio">
            {/* El logo ya dice "SIMBA" */}
            <Image src={BRAND_LOGO} alt="" width={40} height={40} className="rounded-md" />
          </a>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-medium sm:flex" aria-label="Secciones">
            <a href="#menu" className="hover:text-simba-gold">Menú</a>
            <a href="#reservar" className="hover:text-simba-gold">Reservar</a>
            <a href="#ubicacion" className="hover:text-simba-gold">Ubicación</a>
          </nav>
          <a
            href="#reservar"
            className="ml-auto rounded-full bg-simba-gold px-4 py-1.5 text-sm font-semibold text-simba-green hover:bg-simba-gold/90 sm:ml-2"
          >
            Reservar
          </a>
        </div>
      </header>

      {/* ---------- Portada ---------- */}
      <section id="inicio" className="relative isolate flex min-h-[calc(100svh-3.5rem)] items-end overflow-hidden">
        <Image
          src="/landing/hero.webp"
          alt="Costilla de res a la parrilla con papas a la francesa"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[center_35%] md:object-[70%_30%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/10 md:bg-gradient-to-r md:from-black/90 md:via-black/60 md:to-black/5" />
        <div className="mx-auto w-full max-w-6xl px-4 pt-24 pb-12 sm:pb-20">
          <div className="max-w-xl">
            <p className="text-sm font-semibold tracking-[0.2em] text-simba-gold uppercase">Restaurante en Piedecuesta</p>
            <h1 className="mt-2 font-display text-6xl leading-none sm:text-8xl">SIMBA</h1>
            <p className="mt-4 text-xl leading-snug text-white/90 sm:text-2xl">{SITE.tagline}.</p>
            <p className="mt-4 flex flex-wrap gap-2">
              {SITE.specialties.map((s) => (
                <span key={s} className="rounded-full border border-white/30 bg-black/20 px-3 py-1 text-sm backdrop-blur-sm">
                  {s}
                </span>
              ))}
            </p>
            <p className="mt-5 flex items-center gap-2 text-sm text-white/85">
              <ClockIcon className="size-4 text-simba-gold" /> {todayLabel}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#reservar"
                className="inline-flex h-12 items-center rounded-full bg-simba-gold px-6 font-semibold text-simba-green hover:bg-simba-gold/90"
              >
                Reservar mesa
              </a>
              <a
                href="#menu"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/50 px-6 font-semibold hover:bg-white/10"
              >
                <UtensilsIcon className="size-4" /> Ver menú
              </a>
              {orderHref && (
                <a
                  href={orderHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full px-4 font-semibold text-white/90 underline-offset-4 hover:underline"
                >
                  <MessageCircleIcon className="size-4" /> Pedir a domicilio
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Menú ---------- */}
      <MenuSectionList />

      {/* ---------- Reservar ---------- */}
      <section id="reservar" className="scroll-mt-14 bg-simba-forest">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-simba-gold uppercase">Reservas</p>
            <h2 className="mt-1 font-display text-4xl sm:text-5xl">Reserva tu mesa</h2>
            <p className="mt-4 text-lg text-simba-cream/85">
              Cumpleaños, aniversarios, grados o una cena con amigos. Déjanos los datos y te llevamos a WhatsApp con el
              mensaje listo para enviarlo.
            </p>
            <ul className="mt-6 grid gap-2 text-simba-cream/85">
              <li>1. Llena el formulario.</li>
              <li>2. Envía el mensaje por WhatsApp.</li>
              <li>3. Te confirmamos la reserva por el mismo chat.</li>
            </ul>
          </div>
          {wa ? (
            <ReserveForm whatsapp={wa} restaurant={SITE.name} today={date} />
          ) : (
            <p className="rounded-2xl bg-simba-cream p-6 text-simba-forest">
              Escríbenos por Instagram{" "}
              <a href={SITE.instagram} className="font-semibold underline">
                {SITE.instagramHandle}
              </a>{" "}
              para reservar.
            </p>
          )}
        </div>
      </section>

      {/* ---------- Ubicación y horario ---------- */}
      <section id="ubicacion" className="scroll-mt-14 bg-simba-cream text-simba-forest">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-2">
          <div className="grid content-start gap-8">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-simba-rust uppercase">Visítanos</p>
              <h2 className="mt-1 font-display text-4xl text-simba-rust sm:text-5xl">Dónde estamos</h2>
              <p className="mt-4 flex items-start gap-2 text-lg">
                <MapPinIcon className="mt-1 size-5 shrink-0 text-simba-rust" />
                <span>
                  {SITE.address}
                  <br />
                  {SITE.city}
                </span>
              </p>
              <a
                href={MAPS_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-simba-rust px-5 font-semibold text-simba-cream hover:bg-simba-rust/90"
              >
                <NavigationIcon className="size-4" /> Cómo llegar
              </a>
            </div>

            {hasHours && (
              <div>
                <h3 className="flex items-center gap-2 font-display text-2xl text-simba-rust">
                  <ClockIcon className="size-5" /> Horario
                </h3>
                <dl className="mt-3 divide-y divide-simba-rust/15 border-y border-simba-rust/15">
                  {week.map((r) => (
                    <div key={r.days} className="flex justify-between gap-4 py-2.5">
                      <dt className="font-medium">{r.days}</dt>
                      <dd className={cn("text-right", r.closed && "text-simba-forest/60")}>
                        {r.closed ? "Cerrado" : (r.hours ?? "Abierto")}
                      </dd>
                    </div>
                  ))}
                  {holiday && (
                    <div className="flex justify-between gap-4 py-2.5">
                      <dt className="font-medium">Festivos</dt>
                      <dd className="text-right">{holiday}</dd>
                    </div>
                  )}
                </dl>
                {settings.closedWeekdays.length > 0 && (
                  <p className="mt-2 text-sm text-simba-forest/70">
                    Si el día de descanso es festivo, abrimos ese día y descansamos el siguiente.
                  </p>
                )}
              </div>
            )}
          </div>

          <iframe
            title="Mapa: ubicación de Simba"
            src={MAPS_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-80 w-full rounded-2xl border-0 shadow-lg md:min-h-full"
          />
        </div>
      </section>

      {/* ---------- Pie ---------- */}
      <footer className="bg-simba-green">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src={BRAND_LOGO} alt="" width={44} height={44} className="rounded-lg" />
            <div>
              <p className="font-display text-lg">SIMBA</p>
              <p className="text-sm text-simba-cream/70">
                {SITE.address}, {SITE.city}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-simba-gold">
              <CameraIcon className="size-4" /> {SITE.instagramHandle}
            </a>
            {orderHref && (
              <a href={orderHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-simba-gold">
                <MessageCircleIcon className="size-4" /> Pedidos por WhatsApp
              </a>
            )}
            <Link href="/gestion" className="text-simba-cream/40 hover:text-simba-cream/80">
              Acceso empleados
            </Link>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp (celular) */}
      {orderHref && (
        <a
          href={orderHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#1f8f4e] text-white shadow-xl hover:bg-[#1a7a43] sm:hidden"
        >
          <MessageCircleIcon className="size-7" />
        </a>
      )}
    </div>
  );
}

/** Datos estructurados para Google (restaurante, dirección, horario, reservas). */
function JsonLd({
  whatsapp,
  openingHours,
  closedWeekdays,
}: {
  whatsapp: string | null;
  openingHours: string[];
  closedWeekdays: number[];
}) {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = DAYS.flatMap((day, i) => {
    const [opens, closes] = (openingHours[i] ?? "").split("-");
    return !closedWeekdays.includes(i) && opens && closes
      ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens, closes }]
      : [];
  });
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE.name,
    description: SITE.tagline,
    image: "/landing/og.jpg",
    servesCuisine: SITE.specialties,
    priceRange: "$$",
    acceptsReservations: true,
    menu: "/#menu",
    ...(whatsapp && { telephone: `+${whatsapp}` }),
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address,
      addressLocality: "Piedecuesta",
      addressRegion: "Santander",
      addressCountry: "CO",
    },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    sameAs: [SITE.instagram],
    ...(hours.length && { openingHoursSpecification: hours }),
  };
  return (
    <script
      type="application/ld+json"
      // JSON propio (sin datos de usuarios); se escapa "<" para no cerrar el <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
