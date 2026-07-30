"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateMessageBody } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface MessageFormState {
  error?: string;
  success?: boolean;
}

/**
 * Turn a rejection from `send_listing_message` into something a member can act on.
 *
 * The database is the real gate — it re-checks membership, listing availability and
 * self-messaging regardless of what the UI allows — so these map SQLSTATEs raised
 * there rather than duplicating the rules here.
 */
function messageForCode(code: string | undefined, subject: string): string {
  switch (code) {
    case "P0002":
      return `That ${subject} is no longer available.`;
    case "42501":
      return `You can't send a message about this ${subject}.`;
    case "22023":
      return "That message can't be sent as written.";
    default:
      return "Could not send your message. Please try again.";
  }
}

export async function sendMessage(
  _prev: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const listingId = String(formData.get("listingId") ?? "");
  const validated = validateMessageBody(String(formData.get("body") ?? ""));

  if (!listingId) return { error: "Could not tell which item this is about." };
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Everything that matters is enforced inside the function: active member, active
  // listing, active seller, not your own listing, body within bounds. The recipient
  // is read from the listing, so the sender cannot choose who gets the message.
  const { data: threadId, error } = await supabase.rpc("send_listing_message", {
    p_listing_id: listingId,
    p_body: validated.body,
  });

  if (error) return { error: messageForCode(error.code, "item") };

  // Land in the conversation rather than on a "sent" confirmation: it shows the
  // message in context and is the only obvious route back to the thread later.
  // redirect() throws, so nothing below it runs.
  revalidatePath("/messages");
  redirect(`/messages/${threadId}`);
}

export async function replyToThread(
  _prev: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const threadId = String(formData.get("threadId") ?? "");
  const validated = validateMessageBody(String(formData.get("body") ?? ""));

  if (!threadId) return { error: "Could not tell which conversation this is." };
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Participation is checked inside the function, so a forged thread id is refused
  // by the database rather than by this action. Note it deliberately allows replies
  // about sold or deleted listings — see 0004_message_replies.sql.
  const { error } = await supabase.rpc("reply_to_thread", {
    p_thread_id: threadId,
    p_body: validated.body,
  });

  if (error) return { error: messageForCode(error.code, "conversation") };

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");

  return { success: true };
}
