import type { Metadata } from "next";
import Link from "next/link";
import { PeriodNav } from "@/components/period-nav";
import { CsvButton, Stat, UnclosedWarning } from "@/components/report-bits";
import { STATUS_LABEL } from "@/lib/attendance";
import { CURRENCY } from "@/lib/config";
import { verifySession } from "@/lib/dal";
import { formatDayShort, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { periodFromParams, periodPresets } from "@/lib/period-params";
import { ATTENDANCE_COLUMNS } from "@/lib/reports";
import { getReports } from "@/lib/reports-data";

export const metadata: Metadata = { title: "Reportes · Gestión Simba" };

const SECTIONS = [
  { id: "ventas", label: "Ventas" },
  { id: "propinas", label: "Propinas" },
  { id: "asistencia", label: "Asistencia" },
] as const;

export default async function ReportsPage({ searchParams }: PageProps<"/reportes">) {
  await verifySession();
  const { desde, hasta } = await searchParams;
  const period = await periodFromParams(desde, hasta);
  const { sales, tips, attendance, unclosedDays } = await getReports(period);

  const money = (v: number) => formatMoney(v, CURRENCY);
  const csv = (tipo: string) => `/reportes/csv?tipo=${tipo}&desde=${period.from}&hasta=${period.to}`;
  const columns = ATTENDANCE_COLUMNS.filter((s) => s !== "PENDING" || attendance.totals.PENDING > 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-5">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <PeriodNav basePath="/reportes" period={period} presets={await periodPresets()} />
        <UnclosedWarning days={unclosedDays} what="sus ventas y propinas todavía no cuentan." />
        <nav className="flex gap-2 text-sm" aria-label="Secciones">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border px-3 py-1 text-muted-foreground hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ---------- Ventas ---------- */}
      <Section id="ventas" title="Ventas" csv={csv("ventas")}>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Venta total" value={money(sales.totalSales)} strong />
          <Stat
            label="Promedio por día"
            value={money(sales.avgSales)}
            hint={`${sales.days.length} ${sales.days.length === 1 ? "día cerrado" : "días cerrados"}`}
          />
          <Stat label="Propinas" value={money(sales.tipsTotal)} />
          <Stat
            label="Mejor día"
            value={sales.best ? money(sales.best.totalSales) : "—"}
            hint={sales.best ? formatShortDate(sales.best.date) : undefined}
          />
        </dl>
        {sales.days.length === 0 ? (
          <Empty>No hay días cerrados en este periodo.</Empty>
        ) : (
          <Table head={["Fecha", "Venta", "Propinas", "Trabajaron"]}>
            {sales.days.map((d) => (
              <tr key={d.date}>
                <td className="sticky left-0 bg-background px-3 py-2 whitespace-nowrap">
                  <Link href={`/asistencia?fecha=${d.date}`} prefetch={false} className="hover:underline">
                    {formatDayShort(d.date)}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right">{money(d.totalSales)}</td>
                <td className="px-3 py-2 text-right">{money(d.tipsTotal)}</td>
                <td className="px-3 py-2 text-right">{d.workers}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ---------- Propinas por empleado ---------- */}
      <Section id="propinas" title="Propinas por empleado" csv={csv("propinas")}>
        {tips.employees.length === 0 ? (
          <Empty>No hay propinas repartidas en este periodo.</Empty>
        ) : (
          <Table head={["Empleado", "Días con propina", "Propinas"]} foot={["Total", "", money(tips.total)]}>
            {tips.employees.map((e) => (
              <tr key={e.employeeId}>
                <td className="max-w-48 truncate px-3 py-2">{e.name}</td>
                <td className="px-3 py-2 text-right">{e.days}</td>
                <td className="px-3 py-2 text-right font-medium">{money(e.total)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ---------- Asistencia por empleado ---------- */}
      <Section id="asistencia" title="Asistencia por empleado" csv={csv("asistencia")}>
        {attendance.employees.length === 0 ? (
          <Empty>No hay asistencia registrada en este periodo.</Empty>
        ) : (
          <Table
            head={["Empleado", ...columns.map((s) => STATUS_LABEL[s])]}
            foot={["Total", ...columns.map((s) => String(attendance.totals[s]))]}
          >
            {attendance.employees.map((e) => (
              <tr key={e.employeeId}>
                <td className="sticky left-0 max-w-40 truncate bg-background px-3 py-2">{e.name}</td>
                {columns.map((s) => (
                  <td key={s} className={`px-3 py-2 text-right ${e.counts[s] === 0 ? "text-muted-foreground/60" : ""}`}>
                    {e.counts[s]}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

function Section({ id, title, csv, children }: { id: string; title: string; csv: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-20 gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <CsvButton href={csv} label="CSV" />
      </div>
      {children}
    </section>
  );
}

/** Tabla con la primera columna a la izquierda y el resto numérico a la derecha. */
function Table({ head, foot, children }: { head: string[]; foot?: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm tabular-nums">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 font-normal whitespace-nowrap ${i === 0 ? "sticky left-0 bg-muted text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
        {foot && (
          <tfoot className="border-t bg-muted/30 font-medium">
            <tr>
              {foot.map((f, i) => (
                <td key={i} className={`px-3 py-2 ${i === 0 ? "sticky left-0 bg-muted text-left" : "text-right"}`}>
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
