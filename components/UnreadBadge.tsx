/**
 * Unread-message count pill.
 *
 * Lives in its own file because the nav has two implementations — the inline
 * cluster in app/(app)/layout.tsx (desktop) and MobileNav's drawer — and both
 * have to show the same badge. Inlining it in either one guarantees they drift.
 * Renders nothing at zero so callers don't need their own guard.
 */
export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-gold-500 px-1.5 text-xs font-semibold text-slate-900"
    >
      {count}
    </span>
  );
}
