import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY, PAY_WEEK_START, today } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { addDays, daysBetween, formatDateRange, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { weekRange } from "@/lib/payroll";
import { getPayroll, resolvePeriod } from "@/lib/payroll-data";

export const metadata: Metadata = { title: "Pagos · Gestión Simba" };

const periodHref = (from: string, to: string) => `/pagos?desde=${from}&hasta=${to}`;

export default async function PayrollPage({ searchParams }: PageProps<"/pagos">) {
  await verifySession();
  const { desde, hasta } = await searchParams;
  const { from, to } = resolvePeriod(desde, hasta);
  const { summary, unclosedDays } = await getPayroll(from, to);

  const money = (v: number) => formatMoney(v, CURRENCY);
  const length = daysBetween(from, to) + 1;
  const thisWeek = weekRange(today(), PAY_WEEK_START);
  const isThisWeek = from === thisWeek.from && to === thisWeek.to;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <Button
          variant="outline"
          render={<a href={`/pagos/csv?desde=${from}&hasta=${to}`} download />}
          nativeButton={false}
        >
          <DownloadIcon />
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Periodo anterior"
            render={<Link href={periodHref(addDays(from, -length), addDays(to, -length))} />}
            nativeButton={false}
          >
            <ChevronLeftIcon />
          </Button>
          <p className="min-w-0 flex-1 text-center font-medium sm:flex-none sm:px-2">
            {formatDateRange(from, to)}
          </p>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Periodo siguiente"
            render={<Link href={periodHref(addDays(from, length), addDays(to, length))} />}
            nativeButton={false}
          >
            <ChevronRightIcon />
          </Button>
          {!isThisWeek && (
            <Button variant="ghost" size="lg" render={<Link href="/pagos" />} nativeButton={false}>
              Esta semana
            </Button>
          )}
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Elegir otras fechas</summary>
          <form className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={from} required className="w-auto" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={to} required className="w-auto" />
            </div>
            <Button type="submit" variant="outline">
              Ver
            </Button>
          </form>
        </details>
      </div>

      {unclosedDays > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {unclosedDays} {unclosedDays === 1 ? "día de este periodo no está cerrado" : "días de este periodo no están cerrados"}
          : sus pagos y propinas todavía no cuentan.
        </p>
      )}

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Pagos diarios" value={money(summary.totals.pay)} />
        <Stat label="Propinas" value={money(summary.totals.tips)} />
        <Stat label="Total a pagar" value={money(summary.totals.total)} strong />
      </dl>

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
                          <td className="py-1.5">
                            <Link href={`/asistencia?fecha=${x.date}`} prefetch={false} className="hover:underline">
                              {formatShortDate(x.date)}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "rounded-lg bg-primary p-3 text-primary-foreground" : "rounded-lg bg-muted/60 p-3"}>
      <dt className={strong ? "text-xs opacity-80" : "text-xs text-muted-foreground"}>{label}</dt>
      <dd className="text-base font-semibold tabular-nums sm:text-xl">{value}</dd>
    </div>
  );
}
