"use client";

import { useCallback, useState } from "react";
import { formatDateRange, formatDayShort } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { SalesBin } from "@/lib/reports";

/** Verde de la familia de la marca, validado para barras sobre fondo blanco (dataviz). */
const BAR = "#0b8a57";
const BAR_HOVER = "#08704a";

const HEIGHT = 220;
const M = { top: 22, right: 8, bottom: 24, left: 60 };

/** Escala "bonita": pasos de 1, 2, 2,5 o 5 × 10^n. */
function niceTicks(max: number, target = 4) {
  if (max <= 0) return [0];
  const raw = max / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

type Props = { bins: SalesBin[]; unit: "day" | "week"; currency: Currency };

/** Venta por día (o por semana) en columnas, con tooltip. Una sola serie: el título la nombra. */
export function SalesChart({ bins, unit, currency }: Props) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  // Mide el ancho al montar (así dibuja aunque la pestaña no esté visible) y
  // lo actualiza si cambia el tamaño.
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const d = currency.decimals;
  const major = (minor: number) => minor / 10 ** d;
  const compact = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency.code,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const money = (minor: number) => formatMoney(minor, currency);

  const max = Math.max(0, ...bins.map((b) => b.sales));
  const ticks = niceTicks(major(max));
  const top = ticks.at(-1)!;
  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const band = bins.length ? plotW / bins.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2)); // tope de 24 px y al menos 2 px de aire entre barras
  const y = (v: number) => M.top + plotH - (top > 0 ? (v / top) * plotH : 0);
  const labelEvery = Math.max(1, Math.ceil(bins.length / Math.max(1, Math.floor(plotW / 40))));
  const bestIndex = max > 0 ? bins.findIndex((b) => b.sales === max) : -1;

  const binLabel = (b: SalesBin) => (unit === "day" ? formatDayShort(b.from) : formatDateRange(b.from, b.to));
  const hovered = hover !== null ? bins[hover] : null;

  /** Columna con la punta redondeada (4 px) y la base recta. */
  const barPath = (x: number, v: number) => {
    const y0 = M.top + plotH;
    const y1 = y(v);
    const h = y0 - y1;
    const r = Math.min(4, barW / 2, h);
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + barW - r} Q${x + barW},${y1} ${x + barW},${y1 + r} V${y0} Z`;
  };

  return (
    // min-w-0 + overflow-hidden: el SVG no debe impedir que el contenedor se achique (si no, nunca se re-mide más angosto)
    <div ref={measure} className="relative w-full min-w-0 overflow-hidden select-none" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Venta por ${unit === "day" ? "día" : "semana"}. Máximo ${money(max)}. El detalle está en la tabla.`}
          className="block"
        >
          {/* Líneas de referencia y eje Y */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text
                x={M.left - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {compact.format(t)}
              </text>
            </g>
          ))}

          {bins.map((b, i) => {
            const x = M.left + i * band + (band - barW) / 2;
            const cx = M.left + i * band + band / 2;
            return (
              <g key={b.from}>
                {b.sales > 0 && (
                  <path d={barPath(x, major(b.sales))} fill={hover === i ? BAR_HOVER : BAR} />
                )}
                {i === bestIndex && (
                  <text x={cx} y={y(major(b.sales)) - 6} textAnchor="middle" className="fill-foreground text-[11px] font-medium tabular-nums">
                    {compact.format(major(b.sales))}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={cx} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
                    {/* semana: "1 de jul" (sin el día de la semana; \w no reconoce "mié") */}
                    {unit === "day" ? Number(b.from.slice(8)) : formatDayShort(b.from).replace(/^[^,]+,\s*/, "")}
                  </text>
                )}
                {/* Zona de toque: toda la franja, más grande que la barra */}
                <rect
                  x={M.left + i * band}
                  y={M.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
          style={{
            left: Math.min(Math.max(M.left + hover * band + band / 2 - 80, 0), Math.max(0, width - 170)),
            top: 0,
          }}
        >
          <div className="mb-1 font-medium first-letter:uppercase">{binLabel(hovered)}</div>
          {hovered.closedDays === 0 ? (
            <div className="text-muted-foreground">Sin días cerrados</div>
          ) : (
            <dl className="grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
              <dt className="text-muted-foreground">Venta</dt>
              <dd className="text-right font-medium">{money(hovered.sales)}</dd>
              <dt className="text-muted-foreground">Propinas</dt>
              <dd className="text-right">{money(hovered.tips)}</dd>
              {unit === "week" && (
                <>
                  <dt className="text-muted-foreground">Días</dt>
                  <dd className="text-right">{hovered.closedDays}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
