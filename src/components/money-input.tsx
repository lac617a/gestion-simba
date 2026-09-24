"use client";

import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";
import { MAX_MAJOR, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  /** Se envía el texto formateado ("1.250.000"); el servidor lo valida con parseMoney. */
  name: string;
  currency: Currency;
  /** Monto en unidades mínimas (pesos en COP); null = vacío */
  value: number | null;
  onValueChange: (minor: number | null) => void;
  required?: boolean;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
};

/**
 * Campo de dinero: formatea con separador de miles mientras se escribe,
 * no acepta letras ni negativos, y respeta los decimales de la moneda.
 */
export function MoneyInput({ currency, value, onValueChange, invalid, className, ...props }: Props) {
  const d = currency.decimals;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <NumericFormat
        customInput={Input}
        valueIsNumericString
        value={value === null ? "" : (value / 10 ** d).toFixed(d)}
        onValueChange={(v) => onValueChange(v.value === "" ? null : Math.round(Number(v.value) * 10 ** d))}
        isAllowed={(v) => v.floatValue === undefined || v.floatValue <= MAX_MAJOR}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={d}
        allowNegative={false}
        inputMode={d > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cn("pl-6 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
