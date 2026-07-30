import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_MESSAGE_LENGTH } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type {
  ContactProfile,
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

/**
 * Whoever the given member is talking *to*. A conversation list shows one row per
 * thread regardless of who started it, so the name it displays depends on which
 * side the viewer is on. Returns null for a non-party.
 */
export function otherParty(
  thread: Pick<ThreadWithDetails, "buyer_id" | "seller_id" | "buyer" | "seller">,
  userId: string,
): ContactProfile | null {
  if (thread.seller_id === userId) return thread.buyer;
  if (thread.buyer_id === userId) return thread.seller;
  return null;
}

/** A thread's messages oldest-first. Mirrors sortedImages() in lib/listings.ts. */
export function sortedMessages(
  thread: Pick<ThreadWithDetails, "messages">,
): Message[] {
  return [...(thread.messages ?? [])].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

/** The most recent message, for the conversation list's preview line. */
export function lastMessage(
  thread: Pick<ThreadWithDetails, "messages">,
): Message | null {
  const messages = sortedMessages(thread);
  return messages[messages.length - 1] ?? null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Every conversation the member is part of, newest activity first — both the ones
 * they started as a buyer and the ones about their own listings. Once either side
 * can reply, "received" and "sent" stop describing a thread, so the list is flat.
 */
export async function getConversations(
  userId: string,
): Promise<ThreadWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select(THREAD_SELECT)
    // Interpolated into a PostgREST filter, so it must not be user-supplied text.
    // It isn't: callers pass the id from auth.getUser(), a UUID the server read
    // from the verified session. RLS restricts the rows regardless.
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ThreadWithDetails[];
}

/**
 * One conversation with its full history, or null.
 *
 * RLS is the access check: a member who isn't a party gets no row back, so callers
 * can treat null as "not found" without a separate ownership test.
 */
export async function getThread(
  threadId: string,
): Promise<ThreadWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select(THREAD_SELECT)
    .eq("id", threadId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ThreadWithDetails) ?? null;
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
 * Stamp one thread as read on the caller's own side.
 *
 * Takes an existing client instead of creating one, because this runs inside
 * `after()` from a thread page render. Server Components may not call `cookies()`
 * inside an `after` callback, but a client built during render has already
 * resolved the cookie store and closes over it — so it works from either place.
 * Failures are swallowed: a missed read-stamp shows a stale badge, which is not
 * worth failing a page over.
 */
export async function markThreadRead(
  supabase: DB,
  threadId: string,
): Promise<void> {
  await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
}
