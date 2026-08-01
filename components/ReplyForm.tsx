"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  replyToThread,
  type MessageFormState,
} from "@/app/(app)/messages/actions";
import {
  FormError,
  SubmitButton,
  inputClass,
  primaryButtonClass,
} from "@/components/ui";
import { MAX_MESSAGE_LENGTH } from "@/lib/config";

/**
 * Reply box at the foot of a conversation.
 *
 * Unlike the first message, a reply is allowed even when the item has been marked
 * sold or deleted — that is exactly when someone needs to say so.
 */
export function ReplyForm({ threadId }: { threadId: string }) {
  const [state, formAction] = useActionState<MessageFormState, FormData>(
    replyToThread,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once the message is posted. The sent reply is already on the
  // page above (the action revalidates), so leaving the draft would read as if it
  // hadn't sent.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="threadId" value={threadId} />

      <label htmlFor="reply-body" className="sr-only">
        Your reply
      </label>
      <textarea
        id="reply-body"
        name="body"
        rows={3}
        required
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Write a reply…"
        className={`${inputClass} resize-y`}
      />

      <FormError message={state.error} />

      {/* flex-wrap, and the button ahead of the note in the source: on a phone
          the note takes the full width and Send sits below it at full width. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="order-2 text-xs text-slate-400 sm:order-1">
          They&apos;ll see this next time they visit.
        </p>
        <SubmitButton
          pendingText="Sending…"
          className={`order-1 w-full text-sm sm:order-2 sm:w-auto ${primaryButtonClass}`}
        >
          Send
        </SubmitButton>
      </div>
    </form>
  );
}
