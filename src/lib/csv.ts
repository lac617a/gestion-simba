/** CSV para Excel en español: separador ";" y BOM para que respete las tildes. */
export function toCsv(lines: (string | number)[][]) {
  const esc = (v: string | number) => {
    // Texto que Excel tomaría como fórmula (ej. "=…" escrito en una observación) va con ' delante.
    const s = typeof v === "string" && /^[=@\t\r]|^[+-][^\d\s]/.test(v) ? `'${v}` : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + lines.map((l) => l.map(esc).join(";")).join("\r\n") + "\r\n";
}

/** Monto en unidades normales, con "," decimal si la moneda tiene centavos. */
export function moneyCell(minor: number, decimals: number) {
  return (minor / 10 ** decimals).toFixed(decimals).replace(".", ",");
}

export function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
