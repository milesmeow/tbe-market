import { timingSafeEqual } from "node:crypto";

/**
 * Authorizes a request from a cron scheduler.
 *
 * Both supported triggers send the same thing, so one check covers both:
 * Vercel Cron adds `Authorization: Bearer $CRON_SECRET` to its requests
 * automatically, and cron-job.org is configured with that header by hand.
 *
 * Fails closed when `secret` is missing or empty. A public endpoint whose
 * authorization silently disappears along with its environment variable would
 * be worse than no check at all — this mirrors the proxy, which denies access
 * when it *cannot verify* rather than assuming the best.
 */
export function isAuthorizedCronRequest(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!header) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);

  // timingSafeEqual throws on a length mismatch, so the lengths have to be
  // compared first — which leaks the secret's length, and nothing more.
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}
