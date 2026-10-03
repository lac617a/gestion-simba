/**
 * Parámetros de la dirección (?desde=…&q=…) de la administración, en un solo
 * lugar y con nuqs: cada pantalla define sus parámetros con su tipo y valor por
 * defecto; el servidor los lee con su loader y los enlaces se arman con su
 * serializer (que quita los valores por defecto para dejar direcciones limpias).
 * Los componentes de cliente usan los mismos parsers con useQueryState(s).
 *
 * Se importa de "nuqs/server" (sin "use client") para servir en ambos lados.
 */
import { createLoader, createParser, createSerializer, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { isISODate, isISOMonth, type ISODate, type ISOMonth } from "@/lib/dates";

/** Día "YYYY-MM-DD"; si no es una fecha válida se ignora (null). */
export const parseAsISODate = createParser<ISODate>({
  parse: (v) => (isISODate(v) ? v : null),
  serialize: (v) => v,
});

/** Mes "YYYY-MM"; si no es válido se ignora (null). */
export const parseAsMonth = createParser<ISOMonth>({
  parse: (v) => (isISOMonth(v) ? v : null),
  serialize: (v) => v,
});

/** Uno de una lista cerrada de valores; `aliases` traduce valores viejos (enlaces guardados de antes). */
function parseAsOneOf<const T extends string>(values: readonly T[], aliases: Record<string, T> = {}) {
  return createParser<T>({
    parse: (v) => ((values as readonly string[]).includes(v) ? (v as T) : (aliases[v] ?? null)),
    serialize: (v) => v,
  });
}

/** Texto de búsqueda (?q=). */
export const searchParam = { q: parseAsString.withDefault("") };

// ---------- Aviso tras guardar (?aviso=creado) ----------

export const AVISOS = ["creado", "actualizado", "eliminado"] as const;
export type Aviso = (typeof AVISOS)[number];
export const avisoParams = { aviso: parseAsStringLiteral(AVISOS) };
/** withAviso("/gestion/reservas", { aviso: "creado" }) → "/gestion/reservas?aviso=creado" */
export const withAviso = createSerializer(avisoParams);

// ---------- Un día (Asistencia, Nueva reserva) ----------

export const dayParams = { fecha: parseAsISODate };
export const loadDay = createLoader(dayParams);
export const dayHref = createSerializer(dayParams);

// ---------- Periodo (Reportes, Pagos, historial de Reservas) ----------

export const periodParams = { desde: parseAsISODate, hasta: parseAsISODate };
export const loadPeriod = createLoader(periodParams);
export const periodHref = createSerializer(periodParams);

// ---------- Reservas ----------

export const RESERVATION_VIEWS = ["proximas", "historial"] as const;
export const RESERVATION_FILTERS = ["todas", "confirmadas", "llego", "no-vino", "canceladas"] as const;
export type ReservationView = (typeof RESERVATION_VIEWS)[number];
export type ReservationFilter = (typeof RESERVATION_FILTERS)[number];

export const reservationsParams = {
  // "anteriores" era la pestaña de antes del historial
  ver: parseAsOneOf(RESERVATION_VIEWS, { anteriores: "historial" }).withDefault("proximas"),
  ...searchParam,
  // En el historial, las confirmadas de días pasados son las "sin marcar"
  estado: parseAsOneOf(RESERVATION_FILTERS, { "sin-marcar": "confirmadas" }).withDefault("todas"),
  ...periodParams,
};
export const loadReservations = createLoader(reservationsParams);
export const reservationsHref = createSerializer(reservationsParams);

// ---------- Empleados ----------

export const EMPLOYEE_FILTERS = ["activos", "inactivos", "todos"] as const;
export type EmployeeFilter = (typeof EMPLOYEE_FILTERS)[number];
export const employeesParams = {
  ...searchParam,
  estado: parseAsStringLiteral(EMPLOYEE_FILTERS).withDefault("activos"),
};
export const loadEmployees = createLoader(employeesParams);
export const employeesHref = createSerializer(employeesParams);

// ---------- Ficha del empleado ----------

export const EMPLOYEE_PROFILE_VIEWS = ["historial", "datos"] as const;
export type EmployeeProfileView = (typeof EMPLOYEE_PROFILE_VIEWS)[number];
export const employeeProfileParams = {
  ver: parseAsStringLiteral(EMPLOYEE_PROFILE_VIEWS).withDefault("historial"),
  mes: parseAsMonth,
};
export const loadEmployeeProfile = createLoader(employeeProfileParams);
export const employeeProfileHref = createSerializer(employeeProfileParams);

// ---------- Producción ----------

export const PRODUCTION_VIEWS = ["jornadas", "historial"] as const;
export type ProductionView = (typeof PRODUCTION_VIEWS)[number];
export const productionParams = { ver: parseAsStringLiteral(PRODUCTION_VIEWS).withDefault("jornadas") };
export const loadProduction = createLoader(productionParams);
export const productionHref = createSerializer(productionParams);

// ---------- CSV de reportes ----------

export const REPORT_CSV = ["ventas", "propinas", "asistencia", "reservas"] as const;
export const reportCsvParams = { tipo: parseAsStringLiteral(REPORT_CSV), ...periodParams };
export const loadReportCsv = createLoader(reportCsvParams);
export const reportCsvHref = createSerializer(reportCsvParams);
