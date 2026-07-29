"use client";

import { useActionState, useState } from "react";

import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";

import {
  inviteMember,
  type InviteCredentials,
  type InviteFormState,
} from "./actions";

/**
 * Sign-in details for a new member, shown when the invite email didn't deliver
 * them. The temp password is generated server-side and never stored in
 * readable form, so this is the only chance to capture it.
 */
function CredentialsBlock({ credentials }: { credentials: InviteCredentials }) {
  const { loginUrl, email, tempPassword } = credentials;
  const [copied, setCopied] = useState(false);

  const summary = [
    `Sign in: ${loginUrl}`,
    `Email: ${email}`,
    `Temporary password: ${tempPassword}`,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission); the
      // details are on screen either way, so just leave the button alone.
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="mb-2 font-medium text-slate-900">
        Send these sign-in details to {email}
      </p>
      <dl className="space-y-1 text-slate-700">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-slate-500">Sign in</dt>
          <dd className="break-all">{loginUrl}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-slate-500">Email</dt>
          <dd className="break-all">{email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-slate-500">Password</dt>
          <dd>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900">
              {tempPassword}
            </code>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={copy}
        className={`${secondaryButtonClass} mt-3 px-3 py-1 text-sm`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Shown once — copy it before leaving this page. They&apos;ll be asked to
        pick their own password at first login.
      </p>
    </div>
  );
}

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
      {state.credentials && (
        <CredentialsBlock credentials={state.credentials} />
      )}

      <SubmitButton pendingText="Inviting…">Send invite</SubmitButton>
    </form>
  );
}
