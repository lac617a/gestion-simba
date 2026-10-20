import type { NextRequest } from "next/server";
import { pdfResponse } from "@/components/pdf/report-pdf";
import { payWeekNote } from "@/components/pay-week-note";
import { CURRENCY } from "@/lib/config";
import { verifyAdmin } from "@/lib/dal";
import { formatDateRange } from "@/lib/dates";
import { getPayroll } from "@/lib/payroll-data";
import { periodFromParams } from "@/lib/period-params";
import { SITE } from "@/lib/public-site";
import { loadPeriod } from "@/lib/search-params";
import { payrollPdf } from "./payroll-pdf";

export async function GET(req: NextRequest) {
  await verifyAdmin();
  const { desde, hasta } = await loadPeriod(req);
  const period = await periodFromParams(desde, hasta);
  const [{ summary, unclosedDays }, weekNote] = await Promise.all([getPayroll(period), payWeekNote(period)]);
  const pdf = await payrollPdf({
    summary,
    periodLabel: formatDateRange(period.from, period.to),
    restaurant: SITE.name,
    currency: CURRENCY,
    unclosedDays,
    weekNote,
  });
  return pdfResponse(pdf, `pagos_${period.from}_${period.to}.pdf`);
}
