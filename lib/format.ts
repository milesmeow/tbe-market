/** Format an integer number of cents as USD, e.g. 1500 -> "$15.00". */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Parse a user-entered dollar string (e.g. "15", "15.50", "$1,200") to cents. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const dollars = Number.parseFloat(cleaned);
  if (Number.isNaN(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}
