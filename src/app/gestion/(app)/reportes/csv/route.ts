import type { NextRequest } from "next/server";
import { CURRENCY } from "@/lib/config";
import { csvResponse } from "@/lib/csv";
import { verifySession } from "@/lib/dal";
import { periodFromParams } from "@/lib/period-params";
import { attendanceCsv, salesCsv, tipsCsv } from "@/lib/reports";
import { getReports } from "@/lib/reports-data";
import { reservationsCsv } from "@/lib/reservation-report";
import { getReservationReport } from "@/lib/reservations-data";

export async function GET(req: NextRequest) {
  await verifySession();
  const params = req.nextUrl.searchParams;
  const period = await periodFromParams(params.get("desde"), params.get("hasta"));
  const tipo = params.get("tipo");
  const suffix = `${period.from}_${period.to}.csv`;
  if (tipo === "reservas") {
    return csvResponse(reservationsCsv(await getReservationReport(period), period), `reservas_${suffix}`);
  }
  const r = await getReports(period);
  const d = CURRENCY.decimals;

  switch (tipo) {
    case "ventas":
      return csvResponse(salesCsv(r.sales, period, d), `ventas_${suffix}`);
    case "propinas":
      return csvResponse(tipsCsv(r.tips, period, d), `propinas_${suffix}`);
    case "asistencia":
      return csvResponse(attendanceCsv(r.attendance, period), `asistencia_${suffix}`);
    default:
      return new Response("Tipo de reporte inválido", { status: 400 });
  }
}
