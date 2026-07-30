"use client";

import { useActionState } from "react";

import {
  sendMessage,
  type MessageFormState,
} from "@/app/(app)/messages/actions";
import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";
import { MAX_MESSAGE_LENGTH } from "@/lib/config";

/**
 * Send a note to whoever posted an item.
 *
 * Sits below the seller's email and phone on purpose: messaging is a third way to
 * reach them, not a replacement for the other two, and the helper text says plainly
 * that it isn't the fast one.
 */
export function MessageSellerForm({ listingId }: { listingId: string }) {
  // No success branch: a successful send redirects into the new conversation, so
  // the only state this form ever renders is a failure.
  const [state, formAction] = useActionState<MessageFormState, FormData>(
    sendMessage,
    {},
  );

  return (
    <form
      action={formAction}
      className="mt-4 space-y-2 border-t border-slate-100 pt-4"
    >
      <input type="hidden" name="listingId" value={listingId} />

      <label htmlFor="body" className={labelClass}>
        Or send a message
      </label>
      <textarea
        id="body"
        name="body"
        rows={3}
        required
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Is this still available?"
        className={`${inputClass} resize-y`}
      />

      <p className="text-xs text-slate-400">
        They&apos;ll see this next time they visit the marketplace. For a faster
        reply, email or call.
      </p>

      <FormError message={state.error} />

      <SubmitButton
        pendingText="Sending…"
        className={`${secondaryButtonClass} w-full text-sm`}
      >
        Send message
      </SubmitButton>
    </form>
  );
}
