import Link from "next/link";
import { redirect } from "next/navigation";

import { formatRelativeTime } from "@/lib/format";
import {
  getConversations,
  isUnreadFor,
  lastMessage,
  otherParty,
} from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // One flat list: once either side can reply, "received" and "sent" no longer
  // describe a conversation, only who happened to speak first.
  const threads = await getConversations(user.id);

  // Nothing is marked read here — that happens when a thread is opened. Marking
  // the list read would clear the New pills on conversations never looked at.

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">
        Conversations about items — yours and other members&apos;.
      </p>

      {threads.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No messages yet. Ask about an item, or wait for someone to ask about
          one of yours.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {threads.map((thread) => {
            const other = otherParty(thread, user.id);
            const latest = lastMessage(thread);
            const isNew = isUnreadFor(thread, user.id);
            const sentByMe = latest?.sender_id === user.id;

            return (
              <li key={thread.id}>
                <Link
                  href={`/messages/${thread.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                      className={
                        isNew
                          ? "text-sm font-semibold text-slate-900"
                          : "text-sm font-medium text-slate-900"
                      }
                    >
                      {other?.display_name ?? "A member"}
                    </span>
                    <span className="text-sm text-slate-500">
                      ·{" "}
                      {thread.listing?.title ?? (
                        <span className="italic">Item no longer available</span>
                      )}
                    </span>
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
                      {sentByMe && (
                        <span className="text-slate-400">You: </span>
                      )}
                      {latest.body}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
