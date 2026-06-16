"use client";

import { useFormStatus } from "react-dom";

/** Shared Tailwind class strings so inputs/buttons look the same everywhere. */
export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export const labelClass = "block text-sm font-medium text-slate-700 mb-1";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50";

/** Submit button that disables itself and shows pending text while the form posts. */
export function SubmitButton({
  children,
  pendingText = "Working…",
  className = primaryButtonClass,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Red inline error message; renders nothing when there's no message. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
