export function formatBRL(cents: number): string {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(safeCents / 100);
}

export function parseBRLToCents(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return decimalInputToCents(normalized);
}

export function centsToDecimalInput(cents: number): string {
  const safeCents = Number.isFinite(cents) && cents > 0 ? Math.trunc(cents) : 0;
  return (safeCents / 100).toFixed(2);
}

export function isDecimalMoneyInput(value: string): boolean {
  return value === "" || /^\d*(\.\d{0,2})?$/.test(value);
}

export function decimalInputToCents(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!isDecimalMoneyInput(normalized)) {
    return 0;
  }

  const [integerPart = "0", decimalPart = ""] = normalized.split(".");
  const reais = Number.parseInt(integerPart || "0", 10);
  const centavos = Number.parseInt(decimalPart.padEnd(2, "0").slice(0, 2) || "0", 10);

  if (!Number.isFinite(reais) || !Number.isFinite(centavos) || reais < 0 || centavos < 0) {
    return 0;
  }

  return reais * 100 + centavos;
}

export function formatBPS(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}%`;
}

export function percentToBps(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export function bpsToPercentInput(bps: number): string {
  return (bps / 100).toString();
}
