/**
 * Central app configuration. Change APP_NAME here (or via NEXT_PUBLIC_APP_NAME)
 * to rebrand the whole app in one place.
 */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Community Market";

/** Public base URL of the app, used in invite emails (login link). */
export const APP_URL =
  process.env.APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

/** Storage bucket that holds listing photos. */
export const LISTING_IMAGES_BUCKET = "listing-images";

/** Max photos allowed per listing. */
export const MAX_IMAGES_PER_LISTING = 5;

/**
 * Max characters in a message to a seller. Mirrored by a check constraint in
 * `supabase/migrations/0003_messaging.sql` — change both together.
 */
export const MAX_MESSAGE_LENGTH = 2000;
