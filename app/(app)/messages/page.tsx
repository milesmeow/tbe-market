import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { formatPrice, formatRelativeTime } from "@/lib/format";
import {
  getInbox,
  getSentThreads,
  groupByListing,
  isUnreadFor,
  markThreadsRead,
  sortedMessages,
} from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import type { ContactProfile, ThreadWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Email and phone for the other party — there is no reply box, so these are the reply. */
function ContactLinks({ profile }: { profile: ContactProfile | null }) {
  if (!profile?.contact_email && !profile?.contact_phone) {
    return (
      <p className="mt-2 text-xs text-slate-400">No contact info provided.</p>
    );
  }

  return (
    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {profile.contact_email && (
        <a
          href={`mailto:${profile.contact_email}`}
          className="text-slate-500 underline hover:text-slate-700"
        >
          {profile.contact_email}
        </a>
      )}
      {profile.contact_phone && (
        <a
          href={`tel:${profile.contact_phone}`}
          className="text-slate-500 underline hover:text-slate-700"
        >
          {profile.contact_phone}
        </a>
      )}
    </p>
  );
}

function MessageBodies({ thread }: { thread: ThreadWithDetails }) {
  return (
    <div className="mt-2 space-y-2">
      {sortedMessages(thread).map((message) => (
        <p
          key={message.id}
          className="whitespace-pre-wrap text-sm text-slate-700"
        >
          {message.body}
        </p>
      ))}
    </div>
  );
}

function ListingHeading({ thread }: { thread: ThreadWithDetails }) {
  if (!thread.listing) {
    return (
      <h3 className="text-sm font-semibold text-slate-400">
        Item no longer available
      </h3>
    );
  }

  return (
    <h3 className="text-sm font-semibold text-slate-900">
      <Link
        href={`/listings/${thread.listing.id}`}
        className="hover:underline"
      >
        {thread.listing.title}
      </Link>
      <span className="ml-2 font-normal text-slate-500">
        {formatPrice(thread.listing.price_cents)}
      </span>
      {thread.listing.status === "sold" && (
        <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Sold
        </span>
      )}
    </h3>
  );
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [received, sent] = await Promise.all([
    getInbox(user.id),
    getSentThreads(user.id),
  ]);

  // Resolve the "new" flags from the read stamps as they are *now*, before the
  // after() call below clears them — otherwise the visit that first reveals a
  // message would be the one visit that doesn't highlight it.
  const groups = groupByListing(received).map((group) => ({
    ...group,
    entries: group.threads.map((thread) => ({
      thread,
      isNew: isUnreadFor(thread, user.id),
    })),
  }));

  // Marking read is a mutation, and Next forbids those as a render side-effect.
  // after() runs it once the response is sent. `supabase` was built during render,
  // so it already holds the resolved cookie store — a Server Component may not call
  // cookies() inside an after() callback.
  after(() => markThreadsRead(supabase));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">
        Notes from members about your items. Reply by email or phone — there
        isn&apos;t a reply box here yet.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Received
        </h2>

        {groups.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No messages yet. When a member asks about one of your items,
            it&apos;ll show up here.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {groups.map((group) => (
              <div
                key={group.listingId}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <ListingHeading thread={group.threads[0]} />

                <ul className="mt-3 space-y-3">
                  {group.entries.map(({ thread, isNew }) => (
                    <li
                      key={thread.id}
                      className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {thread.buyer?.display_name ?? "A member"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(thread.last_message_at)}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
                            New
                          </span>
                        )}
                      </div>

                      <MessageBodies thread={thread} />
                      <ContactLinks profile={thread.buyer} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {sent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sent
          </h2>

          <div className="mt-3 space-y-3">
            {sent.map((thread) => (
              <div
                key={thread.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <ListingHeading thread={thread} />
                <p className="mt-1 text-xs text-slate-500">
                  To {thread.seller?.display_name ?? "the seller"} ·{" "}
                  {formatRelativeTime(thread.last_message_at)}
                </p>
                <MessageBodies thread={thread} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
