import { addDays, weekdayOf, type ISODate } from "@/lib/dates";

/** Festivo de Colombia en una fecha concreta. */
export type Holiday = { date: ISODate; name: string };

/** Domingo de Pascua (algoritmo gregoriano de Meeus/Jones/Butcher). */
export function easterSunday(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Ley Emiliani: si no cae lunes, el festivo se traslada al lunes siguiente. */
function toMonday(date: ISODate): ISODate {
  return addDays(date, (1 - weekdayOf(date) + 7) % 7);
}

const md = (year: number, month: number, day: number): ISODate =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** Festivos de Colombia de un año, ordenados por fecha (Ley 51 de 1983). */
export function colombianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    // Fechas fijas
    { date: md(year, 1, 1), name: "Año Nuevo" },
    { date: md(year, 5, 1), name: "Día del Trabajo" },
    { date: md(year, 7, 20), name: "Día de la Independencia" },
    { date: md(year, 8, 7), name: "Batalla de Boyacá" },
    { date: md(year, 12, 8), name: "Inmaculada Concepción" },
    { date: md(year, 12, 25), name: "Navidad" },
    // Se trasladan al lunes
    { date: toMonday(md(year, 1, 6)), name: "Día de los Reyes Magos" },
    { date: toMonday(md(year, 3, 19)), name: "Día de San José" },
    { date: toMonday(md(year, 6, 29)), name: "San Pedro y San Pablo" },
    { date: toMonday(md(year, 8, 15)), name: "Asunción de la Virgen" },
    { date: toMonday(md(year, 10, 12)), name: "Día de la Raza" },
    { date: toMonday(md(year, 11, 1)), name: "Todos los Santos" },
    { date: toMonday(md(year, 11, 11)), name: "Independencia de Cartagena" },
    // Según la Pascua
    { date: addDays(easter, -3), name: "Jueves Santo" },
    { date: addDays(easter, -2), name: "Viernes Santo" },
    { date: toMonday(addDays(easter, 39)), name: "Ascensión del Señor" },
    { date: toMonday(addDays(easter, 60)), name: "Corpus Christi" },
    { date: toMonday(addDays(easter, 68)), name: "Sagrado Corazón" },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

const cache = new Map<number, Map<ISODate, string>>();

/** Nombre del festivo en esa fecha, o null si no es festivo. */
export function holidayOn(date: ISODate): string | null {
  const year = Number(date.slice(0, 4));
  let byDate = cache.get(year);
  if (!byDate) {
    byDate = new Map();
    // Dos festivos pueden caer el mismo lunes (ej. 2025-06-30): se unen los nombres.
    for (const h of colombianHolidays(year)) {
      const prev = byDate.get(h.date);
      byDate.set(h.date, prev ? `${prev} y ${h.name}` : h.name);
    }
    cache.set(year, byDate);
  }
  return byDate.get(date) ?? null;
}

/** Próximo festivo desde `date` (incluido). */
export function nextHoliday(date: ISODate): Holiday {
  const year = Number(date.slice(0, 4));
  return [...colombianHolidays(year), ...colombianHolidays(year + 1)].find((h) => h.date >= date)!;
}
