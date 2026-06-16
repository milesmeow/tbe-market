"use client";

import { useActionState } from "react";

import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/ui";

import { inviteMember, type InviteFormState } from "./actions";

export function InviteForm() {
  const [state, formAction] = useActionState<InviteFormState, FormData>(
    inviteMember,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="email" className={labelClass}>
          Member email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="person@example.com"
          className={inputClass}
        />
      </div>

      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}

      <SubmitButton pendingText="Inviting…">Send invite</SubmitButton>
    </form>
  );
}
