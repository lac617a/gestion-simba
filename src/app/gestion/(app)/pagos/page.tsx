import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { PeriodNav } from "@/components/period-nav";
import { CsvButton, Stat, UnclosedWarning } from "@/components/report-bits";
import { APP_TIMEZONE, CURRENCY } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { formatDateRange, formatDayShort } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { periodFromParams, periodPresets } from "@/lib/period-params";
import { getPayroll } from "@/lib/payroll-data";
import { EmployeePayActions, MarkAllPaidButton } from "./pay-actions";

export const metadata: Metadata = { title: "Pagos · Gestión Simba" };

export default async function PayrollPage({ searchParams }: PageProps<"/gestion/pagos">) {
  await verifySession();
  const { desde, hasta } = await searchParams;
  const period = await periodFromParams(desde, hasta);
  const { summary, unclosedDays } = await getPayroll(period);
  const money = (v: number) => formatMoney(v, CURRENCY);
  const payable = summary.employees.filter((e) => e.canPay);
  const common = {
    period,
    periodLabel: formatDateRange(period.from, period.to),
    currency: CURRENCY,
    unclosedDays,
    timeZone: APP_TIMEZONE,
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <CsvButton href={`/gestion/pagos/csv?desde=${period.from}&hasta=${period.to}`} />
      </div>

      <PeriodNav basePath="/gestion/pagos" period={period} presets={await periodPresets()} />

      <UnclosedWarning days={unclosedDays} what="sus pagos y propinas todavía no cuentan." />

      <dl className="grid grid-cols-3 gap-2">
        <Stat
          label="Total del periodo"
          value={money(summary.totals.total)}
          hint={`${money(summary.totals.pay)} + ${money(summary.totals.tips)} propinas`}
        />
        <Stat label="Pagado" value={money(summary.totals.paid)} />
        <Stat label="Por pagar" value={money(summary.totals.pending)} strong />
      </dl>

      <div className="flex justify-end">
        <MarkAllPaidButton
          count={payable.length}
          amount={payable.reduce((s, e) => s + e.total, 0)}
          {...common}
        />
      </div>

      {summary.employees.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No hay días trabajados en días cerrados de este periodo.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {summary.employees.map((e) => (
            <li key={e.employeeId}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.name}</div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {e.days} {e.days === 1 ? "día" : "días"} · {money(e.pay)} + propinas {money(e.tips)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-semibold tabular-nums">{money(e.total)}</div>
                  </div>
                </summary>
                <div className="overflow-x-auto px-4 pb-3">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1.5 text-left font-normal">Fecha</th>
                        <th className="py-1.5 text-right font-normal">Pago</th>
                        <th className="py-1.5 text-right font-normal">Propina</th>
                        <th className="py-1.5 text-right font-normal">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {e.entries.map((x) => (
                        <tr key={x.date}>
                          <td className="py-1.5 whitespace-nowrap">
                            <Link href={`/gestion/asistencia?fecha=${x.date}`} prefetch={false} className="hover:underline">
                              {formatDayShort(x.date)}
                            </Link>
                          </td>
                          <td className="py-1.5 text-right">{money(x.dailyPay)}</td>
                          <td className="py-1.5 text-right">{money(x.tip)}</td>
                          <td className="py-1.5 text-right font-medium">{money(x.dailyPay + x.tip)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <EmployeePayActions employee={e} {...common} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
