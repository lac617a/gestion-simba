import { describe, expect, it } from "vitest";
import {
  dayHref,
  loadDay,
  loadProduction,
  loadReportCsv,
  loadReservations,
  periodHref,
  productionHref,
  reservationsHref,
  withAviso,
} from "./search-params";

describe("parámetros de la dirección", () => {
  it("fechas: solo días válidos", async () => {
    expect(await loadDay({ fecha: "2026-10-01" })).toEqual({ fecha: "2026-10-01" });
    expect(await loadDay({ fecha: "2026-02-30" })).toEqual({ fecha: null });
    expect(await loadDay({ fecha: "mañana" })).toEqual({ fecha: null });
    expect(await loadDay({})).toEqual({ fecha: null });
  });

  it("reservas: valores por defecto, valores inválidos y alias de enlaces viejos", async () => {
    expect(await loadReservations({})).toEqual({
      ver: "proximas",
      q: "",
      estado: "todas",
      desde: null,
      hasta: null,
    });
    expect(await loadReservations({ ver: "anteriores", estado: "sin-marcar" })).toMatchObject({
      ver: "historial",
      estado: "confirmadas",
    });
    expect(await loadReservations({ ver: "cualquiera", estado: "x" })).toMatchObject({ ver: "proximas", estado: "todas" });
  });

  it("los enlaces quitan los valores por defecto", () => {
    expect(reservationsHref("/gestion/reservas", { ver: "proximas", q: "", estado: "todas" })).toBe("/gestion/reservas");
    expect(
      reservationsHref("/gestion/reservas", { ver: "historial", q: "ana gómez", estado: "llego", desde: "2026-09-01", hasta: "2026-09-30" })
    ).toBe("/gestion/reservas?ver=historial&q=ana+gómez&estado=llego&desde=2026-09-01&hasta=2026-09-30"); // nuqs deja las tildes legibles
  });

  it("un periodo se agrega a una dirección que ya tiene otros parámetros", () => {
    expect(periodHref("/gestion/reservas?ver=historial&q=ana", { desde: "2026-10-01", hasta: "2026-10-31" })).toBe(
      "/gestion/reservas?ver=historial&q=ana&desde=2026-10-01&hasta=2026-10-31"
    );
    expect(dayHref("/gestion/asistencia", { fecha: "2026-10-01" })).toBe("/gestion/asistencia?fecha=2026-10-01");
    expect(withAviso("/gestion/usuarios", { aviso: "creado" })).toBe("/gestion/usuarios?aviso=creado");
  });

  it("producción: pestaña de jornadas por defecto", async () => {
    expect(await loadProduction({})).toEqual({ ver: "jornadas" });
    expect(await loadProduction({ ver: "otra" })).toEqual({ ver: "jornadas" });
    expect(await loadProduction({ ver: "historial" })).toEqual({ ver: "historial" });
    expect(productionHref("/gestion/produccion", { ver: "jornadas" })).toBe("/gestion/produccion");
    expect(productionHref("/gestion/produccion", { ver: "historial" })).toBe("/gestion/produccion?ver=historial");
  });

  it("CSV: el tipo debe ser uno de los conocidos", async () => {
    expect(await loadReportCsv(new URL("https://x.co/csv?tipo=ventas&desde=2026-09-01&hasta=2026-09-30"))).toEqual({
      tipo: "ventas",
      desde: "2026-09-01",
      hasta: "2026-09-30",
    });
    expect((await loadReportCsv(new URL("https://x.co/csv?tipo=otro"))).tipo).toBeNull();
  });
});
