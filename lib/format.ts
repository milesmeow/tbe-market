/** Format cents as USD, e.g. 1500 -> "$15.00". Zero is shown as "Free". */
export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
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

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * A timestamp as "3 days ago", for message lists. Anything older than about a
 * month becomes a plain date, since "7 weeks ago" is harder to place than "12 May".
 *
 * `now` is injectable so the behaviour is testable without freezing the clock.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  // Negative means the past, which is what Intl.RelativeTimeFormat expects.
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const elapsed = Math.abs(seconds);

  if (elapsed < MINUTE) return "just now";

  if (elapsed < 30 * DAY) {
    const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
    if (elapsed < HOUR) return rtf.format(Math.round(seconds / MINUTE), "minute");
    if (elapsed < DAY) return rtf.format(Math.round(seconds / HOUR), "hour");
    if (elapsed < WEEK) return rtf.format(Math.round(seconds / DAY), "day");
    return rtf.format(Math.round(seconds / WEEK), "week");
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year:
      then.getUTCFullYear() === now.getUTCFullYear() ? undefined : "numeric",
  }).format(then);
}
