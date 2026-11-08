import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const format = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** "29,90" ou "29.90" → 2990. Retorna null se o texto ainda não é um valor válido. */
const parse = (text: string): number | null => {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
};

/** Campo de preço em reais; o valor guardado continua em centavos. */
const PriceInput = ({ cents, onChange, className = "" }: { cents: number; onChange: (cents: number) => void; className?: string }) => {
  const [text, setText] = useState(format(cents));

  // Atualiza o texto quando o valor muda por fora (ex.: formulário resetado).
  useEffect(() => {
    setText((prev) => (parse(prev) === cents ? prev : format(cents)));
  }, [cents]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const c = parse(e.target.value);
          if (c !== null) onChange(c);
        }}
        onBlur={() => setText(format(cents))}
        className={`pl-9 ${className}`}
      />
    </div>
  );
};

export default PriceInput;
