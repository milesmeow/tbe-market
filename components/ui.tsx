"use client";

import { useFormStatus } from "react-dom";

/*
 * Shared Tailwind class strings so inputs/buttons look the same everywhere.
 *
 * Every interactive class carries `min-h-11` (44px) — the mobile touch-target
 * floor. Don't shrink them at the call site with `py-1`/`py-1.5`; reach for
 * `smallButtonClass` instead, which is visually compact but still 44px tall.
 * Note that none of these set a font size: inputs must inherit the 16px base,
 * because `text-sm` on a field makes iOS Safari zoom the page on focus.
 */
export const inputClass =
  "w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-200";

export const labelClass = "block text-sm font-medium text-slate-700 mb-1";

/** `touch-manipulation` opts out of the double-tap-to-zoom 300ms tap delay. */
export const primaryButtonClass =
  "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 disabled:opacity-50";

/** Compact row/table action button — smaller text and padding, still 44px tall. */
export const smallButtonClass =
  "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 disabled:opacity-50";

/** Header/drawer navigation link. */
export const navLinkClass =
  "inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg px-3 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300";

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
