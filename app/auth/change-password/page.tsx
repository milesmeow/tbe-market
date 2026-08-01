"use client";

import { useActionState } from "react";

import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui";

import {
  changePassword,
  type ChangePasswordState,
} from "./actions";

export default function ChangePasswordPage() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    {},
  );

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a password to finish setting up your account.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className={labelClass}>
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm" className={labelClass}>
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          <FormError message={state.error} />

          <SubmitButton
            pendingText="Saving…"
            className={`w-full ${primaryButtonClass}`}
          >
            Save password
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
