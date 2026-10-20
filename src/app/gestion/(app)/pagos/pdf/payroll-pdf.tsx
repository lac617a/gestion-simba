import "server-only";
import { Text, View } from "@react-pdf/renderer";
import { PDF_COLORS, PdfStat, pdfStyles, reportPdf } from "@/components/pdf/report-pdf";
import { formatMoney, type Currency } from "@/lib/money";
import type { EmployeePayStatus, PayrollWithPayments } from "@/lib/payroll";

/** Ancho de cada columna de la tabla (Empleado se estira). */
const COL = { name: { flex: 1 }, days: { width: 34, textAlign: "right" }, money: { width: 64, textAlign: "right" } } as const;

/** PDF de Pagos: lo mismo que la pantalla, en limpio. Producción solo sale si hubo jornadas. */
export function payrollPdf({
  summary,
  periodLabel,
  restaurant,
  currency,
  unclosedDays,
  weekNote,
}: {
  summary: PayrollWithPayments;
  periodLabel: string;
  restaurant: string;
  currency: Currency;
  unclosedDays: number;
  weekNote: string | null;
}) {
  const money = (v: number) => formatMoney(v, currency);
  const { totals } = summary;
  const withProduction = totals.production > 0;

  // Por pagar: "Pagado" cuando ya no se debe nada; "—" si no había nada que pagar.
  const pending = (e: Pick<EmployeePayStatus, "pending" | "total">, bold = false) =>
    e.total === 0 ? (
      <Text style={[COL.money, { color: PDF_COLORS.muted }]}>—</Text>
    ) : e.pending === 0 ? (
      <Text style={[COL.money, { color: PDF_COLORS.green }]}>Pagado</Text>
    ) : (
      <Text style={[COL.money, bold ? {} : { color: PDF_COLORS.amber }]}>{money(e.pending)}</Text>
    );

  return reportPdf({
    restaurant,
    title: "Pagos",
    subtitle: periodLabel,
    children: (
      <>
        {weekNote && <Text style={pdfStyles.note}>{weekNote}</Text>}
        {unclosedDays > 0 && (
          <Text style={pdfStyles.warning}>
            {unclosedDays} {unclosedDays === 1 ? "día de este periodo no está cerrado" : "días de este periodo no están cerrados"}:
            sus pagos y propinas todavía no cuentan.
          </Text>
        )}

        <View style={pdfStyles.stats}>
          <PdfStat
            label="Total del periodo"
            value={money(totals.total)}
            hint={`${money(totals.pay)} + ${money(totals.tips)} propinas${withProduction ? ` + ${money(totals.production)} producción` : ""}`}
          />
          <PdfStat label="Pagado" value={money(totals.paid)} />
          <PdfStat label="Por pagar" value={money(totals.pending)} strong />
        </View>

        {summary.employees.length === 0 ? (
          <Text style={{ color: PDF_COLORS.muted }}>
            No hay días trabajados (en días cerrados) ni jornadas de producción en este periodo.
          </Text>
        ) : (
          <View>
            <View style={[pdfStyles.row, pdfStyles.headRow]} fixed>
              <Text style={[COL.name, pdfStyles.headCell]}>Empleado</Text>
              <Text style={[COL.days, pdfStyles.headCell]}>Días</Text>
              <Text style={[COL.money, pdfStyles.headCell]}>Pago diario</Text>
              <Text style={[COL.money, pdfStyles.headCell]}>Propinas</Text>
              {withProduction && <Text style={[COL.money, pdfStyles.headCell]}>Producción</Text>}
              <Text style={[COL.money, pdfStyles.headCell]}>Total</Text>
              <Text style={[COL.money, pdfStyles.headCell]}>Pagado</Text>
              <Text style={[COL.money, pdfStyles.headCell]}>Por pagar</Text>
            </View>
            {summary.employees.map((e) => (
              <View key={e.employeeId} style={pdfStyles.row} wrap={false}>
                <Text style={COL.name}>{e.name}</Text>
                <Text style={COL.days}>{e.days}</Text>
                <Text style={COL.money}>{money(e.pay)}</Text>
                <Text style={COL.money}>{money(e.tips)}</Text>
                {withProduction && <Text style={COL.money}>{e.production ? money(e.production) : "—"}</Text>}
                <Text style={[COL.money, { fontFamily: "Helvetica-Bold" }]}>{money(e.total)}</Text>
                <Text style={[COL.money, { color: PDF_COLORS.muted }]}>{money(e.paid)}</Text>
                {pending(e)}
              </View>
            ))}
            <View style={[pdfStyles.row, pdfStyles.totalRow]} wrap={false}>
              <Text style={COL.name}>Total ({summary.employees.length})</Text>
              <Text style={COL.days}>{totals.days}</Text>
              <Text style={COL.money}>{money(totals.pay)}</Text>
              <Text style={COL.money}>{money(totals.tips)}</Text>
              {withProduction && <Text style={COL.money}>{money(totals.production)}</Text>}
              <Text style={COL.money}>{money(totals.total)}</Text>
              <Text style={COL.money}>{money(totals.paid)}</Text>
              {pending(totals, true)}
            </View>
          </View>
        )}
      </>
    ),
  });
}
