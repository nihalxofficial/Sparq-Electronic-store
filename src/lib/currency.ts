// Currency helpers. Prices are stored in the store's own currency; a different
// display currency is converted with the day's rates first.

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
  INR: "₹",
  CAD: "CA$",
  AUD: "AU$",
  JPY: "¥",
  CNY: "¥",
};

/** The symbol for an ISO code, "$" when unknown. */
export function getCurrencySymbol(currency?: string): string {
  if (!currency) return "$";
  const upper = currency.toUpperCase().trim();
  return CURRENCY_SYMBOLS[upper] || upper;
}

/** The decimal places a currency really uses: JPY 0, USD 2, KWD 3. */
export function currencyDecimals(currency: string = "USD"): number {
  try {
    return (
      new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Strips IEEE-754 floating-point noise without rounding away real decimal precision.
 */
export function cleanDecimal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1e6) / 1e6;
}

/** Formats an amount with a symbol, e.g. formatAmount(1200, "৳") => "৳1,200.00". */
export function formatAmount(
  amount: number | string | undefined | null,
  symbol: string,
  opts?: { showDecimals?: boolean; decimals?: number }
): string {
  const num = typeof amount === "number" ? amount : Number(amount) || 0;
  const minDecimals = opts?.decimals ?? (opts?.showDecimals === false ? 0 : 2);
  const maxDecimals = opts?.decimals !== undefined
    ? opts.decimals
    : opts?.showDecimals === false
      ? 0
      : Math.max(minDecimals, 6);
  return `${symbol}${cleanDecimal(num).toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })}`;
}

/** Formats an amount for a currency code, with that currency's own decimals. */
export function formatPrice(
  amount: number | string | undefined | null,
  currency: string = "USD",
  opts?: { showDecimals?: boolean }
): string {
  const decimals = opts?.showDecimals === false ? 0 : currencyDecimals(currency);
  return formatAmount(amount, getCurrencySymbol(currency), { decimals });
}

/** Rounds an amount to the currency's smallest unit, e.g. ¥1,237.6 => ¥1,238. */
export function roundToCurrency(amount: number, currency: string = "USD"): number {
  const factor = 10 ** currencyDecimals(currency);
  return Math.round(amount * factor) / factor;
}

/** Converts between currencies using rates on one base, e.g. { USD: 1, BDT: 124 }. */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  const fromRate = rates[from.toUpperCase()];
  const toRate = rates[to.toUpperCase()];
  // An unknown pair leaves the number untouched rather than inventing a price.
  if (!fromRate || !toRate) return amount;
  return cleanDecimal((amount / fromRate) * toRate);
}
