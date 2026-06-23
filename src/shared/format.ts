// Number formatting helpers shared across illustrations (axis ticks, numeric
// form fields). Locale-independent so the terminal look stays consistent.

/**
 * Format a number with thousands separators (e.g. `20000` → `"20,000"`). Groups
 * the integer part; preserves the sign and any fractional part.
 */
export function groupThousands(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const [int, frac] = Math.abs(n).toString().split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
}

/** Inverse of {@link groupThousands} for parsing user input: strips separators. */
export function parseGrouped(s: string): number {
  return Number(s.replace(/,/g, "").trim());
}
