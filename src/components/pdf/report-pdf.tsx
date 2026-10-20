import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image as PdfImage, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatMoment } from "@/components/history-timeline";
import { APP_VERSION } from "@/lib/version";

/**
 * Base de los PDF de reportes (Pagos…): hoja A4 con el logo, el título y el
 * periodo arriba, y la fecha en que se generó y el número de página abajo.
 * Helvetica (la de los PDF) trae tildes y ñ; no hay que cargar fuentes.
 */

export const PDF_COLORS = {
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  soft: "#f4f4f5",
  amber: "#92400e",
  amberSoft: "#fffbeb",
  green: "#047857",
};

export const pdfStyles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontFamily: "Helvetica", fontSize: 9, color: PDF_COLORS.text },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  logo: { width: 34, height: 34, borderRadius: 6 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  subtitle: { color: PDF_COLORS.muted, fontSize: 10, marginTop: 2 },
  note: { borderRadius: 6, padding: 8, marginBottom: 10, backgroundColor: PDF_COLORS.soft, color: PDF_COLORS.muted },
  warning: { borderRadius: 6, padding: 8, marginBottom: 10, backgroundColor: PDF_COLORS.amberSoft, color: PDF_COLORS.amber },
  stats: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat: { flex: 1, borderRadius: 6, padding: 9, backgroundColor: PDF_COLORS.soft },
  statStrong: { backgroundColor: PDF_COLORS.text, color: "#ffffff" },
  statLabel: { fontSize: 8, color: PDF_COLORS.muted },
  statValue: { fontFamily: "Helvetica-Bold", fontSize: 14, marginTop: 3 },
  statHint: { fontSize: 7.5, color: PDF_COLORS.muted, marginTop: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border, paddingVertical: 5 },
  headRow: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.text, paddingTop: 0 },
  totalRow: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: PDF_COLORS.text, fontFamily: "Helvetica-Bold" },
  headCell: { fontSize: 8, color: PDF_COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: PDF_COLORS.muted,
  },
});

/** Logo del restaurante (public/brand; next.config lo incluye en las rutas /gestion/…/pdf). */
async function logo() {
  try {
    return await readFile(path.join(process.cwd(), "public/brand/simba-logo.png"));
  } catch {
    return null;
  }
}

export function PdfStat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <View style={strong ? [pdfStyles.stat, pdfStyles.statStrong] : pdfStyles.stat}>
      <Text style={strong ? [pdfStyles.statLabel, { color: "#d4d4d8" }] : pdfStyles.statLabel}>{label}</Text>
      <Text style={pdfStyles.statValue}>{value}</Text>
      {hint && <Text style={pdfStyles.statHint}>{hint}</Text>}
    </View>
  );
}

/** Arma el PDF: encabezado y pie en cada hoja, el contenido en medio. */
export async function reportPdf({
  restaurant,
  title,
  subtitle,
  children,
}: {
  restaurant: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const image = await logo();
  const generated = `Generado el ${formatMoment(new Date())}`;

  return renderToBuffer(
    <Document title={`${title} · ${subtitle}`} author={restaurant} creator={`Gestión ${restaurant}`} language="es">
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          {image && <PdfImage src={image} style={pdfStyles.logo} />}
          <View>
            <Text style={pdfStyles.title}>
              {title} · {restaurant}
            </Text>
            <Text style={pdfStyles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        {children}
        <View style={pdfStyles.footer} fixed>
          <Text>
            {generated} · Gestión {restaurant}, versión {APP_VERSION}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function pdfResponse(body: Buffer, filename: string) {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
