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
 * Copy `text`, falling back to the legacy path on insecure origins.
 *
 * `navigator.clipboard` only exists in a secure context — https, or localhost.
 * It is undefined when the app is reached over plain http by IP (a phone on the
 * LAN hitting the dev server), so the deprecated `execCommand` path is the only
 * thing that works there. Returns false when both paths fail, so the caller can
 * tell the user to select the text by hand.
 */
async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or clipboard unavailable — try the legacy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  // Off-screen but still focusable; execCommand needs a real selection.
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  try {
    textarea.select();
    textarea.setSelectionRange(0, text.length); // iOS Safari needs the range.
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/** Copy button that reports success or failure inline. */
function CopyButton({
  text,
  label,
  onResult,
}: {
  text: string;
  label: string;
  onResult: (ok: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text);
        onResult(ok);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      className={`${secondaryButtonClass} px-3 py-1 text-sm`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

/**
 * Sign-in details for a new member, shown when the invite email didn't deliver
 * them. The temp password is generated server-side and never stored in
 * readable form, so this is the only chance to capture it.
 */
function CredentialsBlock({ credentials }: { credentials: InviteCredentials }) {
  const { loginUrl, email, tempPassword } = credentials;
  const [failed, setFailed] = useState(false);

  const summary = [
    `Sign in: ${loginUrl}`,
    `Email: ${email}`,
    `Temporary password: ${tempPassword}`,
  ].join("\n");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="mb-2 font-medium text-slate-900">
        Send these sign-in details to {email}
      </p>
      <dl className="space-y-1 text-slate-700">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-slate-500">Sign in</dt>
          <dd className="break-all select-all">{loginUrl}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-slate-500">Email</dt>
          <dd className="break-all select-all">{email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-slate-500">Password</dt>
          <dd>
            <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono text-slate-900">
              {tempPassword}
            </code>
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={summary} label="Copy all" onResult={(ok) => setFailed(!ok)} />
        <CopyButton
          text={tempPassword}
          label="Copy password"
          onResult={(ok) => setFailed(!ok)}
        />
      </div>

      {failed && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Your browser blocked the clipboard. Select the text above and copy it
          manually — a tap or triple-click selects each value.
        </p>
      )}

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
