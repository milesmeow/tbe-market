import Link from "next/link";

import { formatRelativeTime } from "@/lib/format";
import { isUnreadFor, lastMessage, otherParty } from "@/lib/messages";
import type { ThreadWithDetails } from "@/lib/types";

/**
 * One conversation, as a tappable summary.
 *
 * Shared by the conversation list and the listing page so the two can't drift.
 * It composes the tested helpers in lib/messages rather than re-deriving "who am
 * I talking to" and "is this unread" inline — those rules are subtle enough that
 * a second copy would eventually disagree with the first.
 *
 * `showListing` is the only difference between the two callers: on a listing page
 * the item title is redundant, and on the inbox it's the main thing you scan for.
 */
export function ThreadRow({
  thread,
  viewerId,
  showListing = false,
}: {
  thread: ThreadWithDetails;
  viewerId: string;
  showListing?: boolean;
}) {
  const other = otherParty(thread, viewerId);
  const latest = lastMessage(thread);
  const isNew = isUnreadFor(thread, viewerId);
  const sentByMe = latest?.sender_id === viewerId;

  return (
    <Link
      href={`/messages/${thread.id}`}
      className="block touch-manipulation rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-50"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={`min-w-0 break-words text-sm text-slate-900 ${
            isNew ? "font-semibold" : "font-medium"
          }`}
        >
          {other?.display_name ?? "A member"}
        </span>

        {showListing && (
          <span className="text-sm text-slate-500">
            ·{" "}
            {thread.listing?.title ?? (
              <span className="italic">Item no longer available</span>
            )}
          </span>
        )}

        {isNew && (
          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
            New
          </span>
        )}

        <span className="ml-auto shrink-0 text-xs text-slate-400">
          {formatRelativeTime(thread.last_message_at)}
        </span>
      </div>

      {latest && (
        <p className="mt-1 truncate text-sm text-slate-600">
          {sentByMe && <span className="text-slate-400">You: </span>}
          {latest.body}
        </p>
      )}
    </Link>
  );
}
