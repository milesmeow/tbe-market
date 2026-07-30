import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_MESSAGE_LENGTH } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type {
  Database,
  Message,
  ThreadWithDetails,
} from "@/lib/types";

type DB = SupabaseClient<Database>;

// message_threads has three foreign keys into profiles (buyer, seller, last sender),
// so every profile embed must name the constraint it travels — an unqualified
// `profiles(...)` would be ambiguous. Same disambiguation as LISTING_SELECT.
const THREAD_SELECT = `
  *,
  messages(*),
  listing:listings!message_threads_listing_id_fkey(id, title, price_cents, status),
  buyer:profiles!message_threads_buyer_id_fkey(id, display_name, contact_email, contact_phone),
  seller:profiles!message_threads_seller_id_fkey(id, display_name, contact_email, contact_phone)
`;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Trim and bounds-check a message body. The same limits exist as a check
 * constraint in the database, which is the real enforcement — this exists to turn
 * a rejection into a sentence the sender can act on instead of a raised exception.
 */
export function validateMessageBody(
  raw: string,
): { body: string } | { error: string } {
  const body = raw.trim();
  if (!body) return { error: "Please write a message." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }
  return { body };
}

/**
 * Has this thread got activity the given member hasn't seen? Mirrors the SQL in
 * `unread_thread_count()`: a thread is unread when someone *else* sent the newest
 * message and it postdates your own read stamp.
 */
export function isUnreadFor(
  thread: Pick<
    ThreadWithDetails,
    | "buyer_id"
    | "seller_id"
    | "last_sender_id"
    | "last_message_at"
    | "buyer_read_at"
    | "seller_read_at"
  >,
  userId: string,
): boolean {
  if (thread.last_sender_id === userId) return false;

  // Answer for a non-party rather than falling through to "never read", which
  // would report an unread thread to someone with no business seeing it. RLS
  // already makes that unreachable; this keeps the predicate honest anyway.
  const isSeller = thread.seller_id === userId;
  const isBuyer = thread.buyer_id === userId;
  if (!isSeller && !isBuyer) return false;

  const readAt = isSeller ? thread.seller_read_at : thread.buyer_read_at;
  if (readAt === null) return true;
  return new Date(thread.last_message_at) > new Date(readAt);
}

/** A listing and the threads about it, for the grouped inbox. */
export interface ThreadGroup {
  listingId: string;
  listing: ThreadWithDetails["listing"];
  threads: ThreadWithDetails[];
}

/**
 * Group threads under the listing they concern, preserving the order they arrive
 * in — the query sorts by recent activity, so the busiest item stays on top.
 */
export function groupByListing(threads: ThreadWithDetails[]): ThreadGroup[] {
  const groups: ThreadGroup[] = [];
  const byListing = new Map<string, ThreadGroup>();

  for (const thread of threads) {
    let group = byListing.get(thread.listing_id);
    if (!group) {
      group = {
        listingId: thread.listing_id,
        listing: thread.listing,
        threads: [],
      };
      byListing.set(thread.listing_id, group);
      groups.push(group);
    }
    group.threads.push(thread);
  }

  return groups;
}

/** A thread's messages oldest-first. Mirrors sortedImages() in lib/listings.ts. */
export function sortedMessages(thread: ThreadWithDetails): Message[] {
  return [...(thread.messages ?? [])].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function threadsFor(
  column: "seller_id" | "buyer_id",
  userId: string,
): Promise<ThreadWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select(THREAD_SELECT)
    .eq(column, userId)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ThreadWithDetails[];
}

/** Threads about listings the member is selling — what they've received. */
export function getInbox(userId: string): Promise<ThreadWithDetails[]> {
  return threadsFor("seller_id", userId);
}

/** Threads the member started as a buyer — what they've sent. */
export function getSentThreads(userId: string): Promise<ThreadWithDetails[]> {
  return threadsFor("buyer_id", userId);
}

/**
 * Unread thread count for the nav badge.
 *
 * Returns 0 on error rather than throwing: this runs in the authenticated layout,
 * so a failure here would take down every signed-in page. A missing badge is a far
 * better outcome than a blank site if the migration hasn't been applied yet.
 */
export async function unreadThreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_thread_count");
  if (error) return 0;
  return data ?? 0;
}

/**
 * Stamp the caller's own side of every thread they're party to as read.
 *
 * Takes an existing client instead of creating one, because this runs inside
 * `after()` from an inbox page render. Server Components may not call `cookies()`
 * inside an `after` callback, but a client built during render has already
 * resolved the cookie store and closes over it — so it works from either place.
 * Failures are swallowed: a missed read-stamp shows a stale badge, which is not
 * worth failing a page over.
 */
export async function markThreadsRead(supabase: DB): Promise<void> {
  await supabase.rpc("mark_threads_read");
}
