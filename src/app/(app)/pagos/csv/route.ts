import type { NextRequest } from "next/server";
import { CURRENCY } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { payrollCsv } from "@/lib/payroll";
import { getPayroll, resolvePeriod } from "@/lib/payroll-data";

export async function GET(req: NextRequest) {
  await verifySession();
  const params = req.nextUrl.searchParams;
  const { from, to } = resolvePeriod(params.get("desde"), params.get("hasta"));
  const { summary } = await getPayroll(from, to);

  return new Response(payrollCsv(summary, from, to, CURRENCY.decimals), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos_${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
