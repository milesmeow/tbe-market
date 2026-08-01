import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";

import { ReplyForm } from "@/components/ReplyForm";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import {
  getThread,
  markThreadRead,
  otherParty,
  sortedMessages,
} from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing for a member who isn't a party, so "not found" and
  // "not yours" are the same answer — which is also the answer that leaks least.
  const thread = await getThread(id);
  if (!thread) notFound();

  const other = otherParty(thread, user.id);
  const messages = sortedMessages(thread);

  // Mark read after the response is sent: Next forbids mutations during render,
  // and `supabase` was built during render so it already holds the cookie store
  // (a Server Component may not call cookies() inside an after() callback).
  after(() => markThreadRead(supabase, id));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/messages"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← All messages
      </Link>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        {thread.listing ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <Link
              href={`/listings/${thread.listing.id}`}
              className="min-w-0 break-words font-semibold text-slate-900 hover:underline"
            >
              {thread.listing.title}
            </Link>
            <span className="text-sm text-slate-500">
              {formatPrice(thread.listing.price_cents)}
            </span>
            {thread.listing.status === "sold" && (
              <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Sold
              </span>
            )}
          </div>
        ) : (
          <p className="font-semibold text-slate-400">
            Item no longer available
          </p>
        )}

        <p className="mt-1 text-sm text-slate-600">
          With {other?.display_name ?? "a member"}
        </p>

        {(other?.contact_email || other?.contact_phone) && (
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {other?.contact_email && (
              <a
                href={`mailto:${other.contact_email}`}
                className="break-all text-slate-500 underline hover:text-slate-700"
              >
                {other.contact_email}
              </a>
            )}
            {other?.contact_phone && (
              <a
                href={`tel:${other.contact_phone}`}
                className="break-all text-slate-500 underline hover:text-slate-700"
              >
                {other.contact_phone}
              </a>
            )}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {messages.map((message) => {
          const mine = message.sender_id === user.id;
          return (
            <li
              key={message.id}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <div className="min-w-0 max-w-[85%]">
                <div
                  className={
                    mine
                      ? "rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2 text-sm text-white"
                      : "rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800"
                  }
                >
                  {/* break-words as well as whitespace-pre-wrap: the latter
                      preserves the member's line breaks but will not break a
                      pasted URL, which then blows past max-w-[85%]. */}
                  <p className="whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                </div>
                <p
                  className={`mt-1 text-[11px] text-slate-400 ${
                    mine ? "text-right" : "text-left"
                  }`}
                >
                  {mine ? "You" : (other?.display_name ?? "Them")} ·{" "}
                  {formatRelativeTime(message.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <ReplyForm threadId={thread.id} />
    </div>
  );
}
