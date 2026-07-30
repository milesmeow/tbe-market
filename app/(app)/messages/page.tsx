import { redirect } from "next/navigation";

import { ThreadRow } from "@/components/ThreadRow";
import { getConversations } from "@/lib/messages";
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
          {threads.map((thread) => (
            <li key={thread.id}>
              <ThreadRow thread={thread} viewerId={user.id} showListing />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
