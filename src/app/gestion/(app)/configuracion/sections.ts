/**
 * Secciones de Configuración: el menú lateral (computador) y la lista (celular).
 * Cada una es su propia pantalla en /gestion/configuracion/<slug>. Solo "cuenta"
 * es para todos los usuarios; las demás, para administradores.
 */
export const SETTINGS_SECTIONS = [
  { slug: "cuenta", title: "Mi cuenta", description: "Tu correo, tu contraseña y las sesiones abiertas." },
  { slug: "restaurante", title: "Restaurante", description: "WhatsApp, página pública y datos generales." },
  { slug: "horarios", title: "Horarios y turnos", description: "Horario de atención y días con doble turno." },
  { slug: "puestos", title: "Puestos y pago diario", description: "Los puestos, lo que gana cada uno por día y la producción." },
  { slug: "semana-de-pago", title: "Semana de pago", description: "Cuándo empieza la semana, cuándo se paga y los lunes festivos." },
  { slug: "reservas", title: "Reservas", description: "Correo de recordatorios y Google Calendar." },
  { slug: "respaldos", title: "Respaldos", description: "Copia de los datos: por correo cada mañana o para descargar." },
] as const;

export type SettingsSlug = (typeof SETTINGS_SECTIONS)[number]["slug"];

export const SETTINGS_HOME = "/gestion/configuracion";
export const settingsHref = (slug: SettingsSlug) => `${SETTINGS_HOME}/${slug}`;

export function settingsSection(slug: SettingsSlug) {
  return SETTINGS_SECTIONS.find((s) => s.slug === slug)!;
}
