"use client";

import { useActionState } from "react";

import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/ui";

import { updateProfile, type ProfileFormState } from "./actions";

export function ProfileForm({
  defaults,
}: {
  defaults: {
    display_name: string;
    contact_email: string;
    contact_phone: string;
  };
}) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="display_name" className={labelClass}>
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={80}
          defaultValue={defaults.display_name}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contact_email" className={labelClass}>
          Contact email
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={defaults.contact_email}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contact_phone" className={labelClass}>
          Contact phone
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          defaultValue={defaults.contact_phone}
          className={inputClass}
        />
      </div>

      <p className="text-xs text-slate-400">
        Your contact details are shown on your listings to other members so they
        can reach you.
      </p>

      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Profile saved.
        </p>
      )}

      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
