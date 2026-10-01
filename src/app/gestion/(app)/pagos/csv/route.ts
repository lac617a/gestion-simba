import type { NextRequest } from "next/server";
import { CURRENCY } from "@/lib/config";
import { csvResponse } from "@/lib/csv";
import { verifyAdmin } from "@/lib/dal";
import { payrollCsv } from "@/lib/payroll";
import { getPayroll } from "@/lib/payroll-data";
import { periodFromParams } from "@/lib/period-params";
import { loadPeriod } from "@/lib/search-params";

export async function GET(req: NextRequest) {
  await verifyAdmin();
  const { desde, hasta } = await loadPeriod(req);
  const period = await periodFromParams(desde, hasta);
  const { summary } = await getPayroll(period);
  return csvResponse(payrollCsv(summary, period.from, period.to, CURRENCY.decimals), `pagos_${period.from}_${period.to}.csv`);
}
