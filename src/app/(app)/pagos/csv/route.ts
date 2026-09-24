import type { NextRequest } from "next/server";
import { CURRENCY } from "@/lib/config";
import { csvResponse } from "@/lib/csv";
import { verifySession } from "@/lib/dal";
import { payrollCsv } from "@/lib/payroll";
import { getPayroll } from "@/lib/payroll-data";
import { periodFromParams } from "@/lib/period-params";

export async function GET(req: NextRequest) {
  await verifySession();
  const params = req.nextUrl.searchParams;
  const period = await periodFromParams(params.get("desde"), params.get("hasta"));
  const { summary } = await getPayroll(period);
  return csvResponse(payrollCsv(summary, period.from, period.to, CURRENCY.decimals), `pagos_${period.from}_${period.to}.csv`);
}
