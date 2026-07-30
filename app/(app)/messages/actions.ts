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
function messageForCode(code?: string): string {
  switch (code) {
    case "P0002":
      return "That item is no longer available.";
    case "42501":
      return "You can't send a message about this item.";
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
  const { error } = await supabase.rpc("send_listing_message", {
    p_listing_id: listingId,
    p_body: validated.body,
  });

  if (error) return { error: messageForCode(error.code) };

  // Both pages read cookies and are already dynamic, so this is belt-and-braces
  // rather than load-bearing — it just keeps the sender's own inbox current.
  revalidatePath("/messages");

  return { success: true };
}
