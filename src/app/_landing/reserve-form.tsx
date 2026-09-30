"use client";

import { useEffect, useState } from "react";
import { MessageCircleIcon } from "lucide-react";
import { localNow, type LocalNow } from "@/lib/dates";
import { formatTime } from "@/lib/hours";
import { reservationRequestMessage } from "@/lib/public-site";
import { hoursOn, isPastSlot, timeSlots } from "@/lib/reservation-slots";
import { OCCASIONS, OTHER_OCCASION, whatsappHref } from "@/lib/reservations";

const FIELD =
  "h-11 w-full min-w-0 rounded-lg border border-simba-forest/20 bg-white px-3 text-base text-simba-forest outline-none placeholder:text-simba-forest/40 focus-visible:border-simba-rust focus-visible:ring-3 focus-visible:ring-simba-rust/25";
const LABEL = "text-sm font-medium text-simba-forest";

type Props = {
  /** Número para wa.me (con indicativo) */
  whatsapp: string;
  restaurant: string;
  /** Hoy al generar la página (se recalcula en el navegador: la página se guarda en caché) */
  today: string;
  /** Zona horaria del restaurante */
  timeZone: string;
  /** Horario por día de la semana (Configuración) */
  openingHours: string[];
};

/**
 * La reserva NO se guarda en el sistema: arma el mensaje y abre el WhatsApp del
 * restaurante; allí la confirman y el empleado la anota en /gestion/reservas.
 */
export function ReserveForm({ whatsapp, restaurant, today, timeZone, openingHours }: Props) {
  const [occasion, setOccasion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  // La hora real solo se conoce en el navegador (la página viene de caché); hasta entonces se muestran todas.
  const [now, setNow] = useState<LocalNow | null>(null);
  useEffect(() => {
    const tick = () => {
      const n = localNow(timeZone);
      setNow(n);
      setDate((d) => (d < n.date ? n.date : d));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timeZone]);

  const minDate = now?.date ?? today;
  // Horas del día elegido; hoy, solo las que no han pasado.
  const slots = timeSlots(hoursOn(date, openingHours)).filter((t) => !now || !isPastSlot(date, t, now));
  const chosen = slots.includes(time) ? time : "";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const people = Number(get("people"));
    const current = localNow(timeZone);
    if (get("date") < current.date) return setError("Elige una fecha de hoy en adelante.");
    if (!get("time")) return setError("Elige la hora.");
    if (isPastSlot(get("date"), get("time"), current)) return setError("Esa hora ya pasó. Elige una más tarde.");
    if (!Number.isInteger(people) || people < 1) return setError("¿Para cuántas personas?");
    setError(null);

    const message = reservationRequestMessage(
      {
        name: get("name"),
        date: get("date"),
        time: get("time"),
        people,
        occasion: occasion === OTHER_OCCASION ? get("occasionOther") : occasion,
        honoree: get("honoree"),
        note: get("note"),
      },
      restaurant,
      formatTime(get("time"))
    );
    window.open(whatsappHref(whatsapp, message), "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl bg-simba-cream p-5 shadow-xl sm:p-7">
      <div className="grid gap-1.5">
        <label htmlFor="r-name" className={LABEL}>
          Nombre *
        </label>
        <input id="r-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="r-date" className={LABEL}>
            Fecha *
          </label>
          <input
            id="r-date"
            name="date"
            type="date"
            required
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={FIELD}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="r-time" className={LABEL}>
            Hora *
          </label>
          <select id="r-time" name="time" required value={chosen} onChange={(e) => setTime(e.target.value)} className={FIELD}>
            <option value="" disabled>
              {slots.length ? "Elige la hora" : "Ya no quedan horas"}
            </option>
            {slots.map((t) => (
              <option key={t} value={t}>
                {formatTime(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="r-people" className={LABEL}>
            Personas *
          </label>
          <input
            id="r-people"
            name="people"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            defaultValue={2}
            required
            className={FIELD}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="r-occasion" className={LABEL}>
            Ocasión
          </label>
          <select
            id="r-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className={FIELD}
          >
            <option value="">Ninguna</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER_OCCASION}>Otra…</option>
          </select>
        </div>
      </div>

      {occasion && (
        <div className="grid gap-3 sm:grid-cols-2">
          {occasion === OTHER_OCCASION && (
            <input name="occasionOther" placeholder="¿Cuál ocasión?" aria-label="Otra ocasión" maxLength={60} className={FIELD} />
          )}
          <input
            name="honoree"
            placeholder="¿Quién celebra? (opcional)"
            aria-label="Persona de la ocasión"
            maxLength={80}
            className={`${FIELD} ${occasion === OTHER_OCCASION ? "" : "sm:col-span-2"}`}
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <label htmlFor="r-note" className={LABEL}>
          Observación
        </label>
        <textarea
          id="r-note"
          name="note"
          rows={2}
          maxLength={300}
          placeholder="Ej. mesa afuera, traemos torta, silla para bebé…"
          className={`${FIELD} h-auto py-2`}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-simba-rust">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1f8f4e] px-6 text-base font-semibold text-white transition-colors hover:bg-[#1a7a43] focus-visible:ring-3 focus-visible:ring-[#1f8f4e]/40 focus-visible:outline-none"
      >
        <MessageCircleIcon className="size-5" /> Enviar reserva por WhatsApp
      </button>
      <p className="text-center text-xs text-simba-forest/70">
        Se abre WhatsApp con tu mensaje listo. La reserva queda confirmada cuando te respondamos.
      </p>
    </form>
  );
}
