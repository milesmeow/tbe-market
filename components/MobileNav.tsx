"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { UnreadBadge } from "@/components/UnreadBadge";

/**
 * Phone navigation: a hamburger that opens the links the header can't fit.
 *
 * Below `sm` the desktop cluster in app/(app)/layout.tsx is hidden and this
 * takes over; the logo, "+ Post" and the unread badge stay in the bar so the
 * two things members do most never cost a tap. Only the open/closed state is
 * client-side — the layout stays a Server Component and passes results in.
 *
 * `signOut` arrives as a server action and is rendered inside a real <form>:
 * it redirects, which a fetch from a click handler could not do.
 */
export function MobileNav({
  isAdmin,
  unread,
  signOut,
}: {
  isAdmin: boolean;
  unread: number;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const itemClass =
    "flex min-h-11 touch-manipulation items-center gap-2 rounded-lg px-3 text-slate-700 transition hover:bg-slate-100";

  return (
    <div ref={containerRef} className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="relative inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
        {/* The badge is inside the drawer when closed, so surface it on the
            button too — otherwise a new message is invisible on a phone. */}
        {!open && unread > 0 && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-gold-500" />
        )}
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="pb-safe absolute inset-x-0 top-full z-50 border-b border-slate-200 bg-white shadow-lg"
        >
          {/* Dismiss on any activation inside the panel — navigating is an
              implicit dismissal, and it beats reacting to a pathname change
              after the fact. */}
          <nav
            onClick={() => setOpen(false)}
            className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2"
          >
            <Link href="/messages" className={itemClass}>
              Messages
              <UnreadBadge count={unread} />
            </Link>
            <Link href="/profile" className={itemClass}>
              Profile
            </Link>
            {isAdmin && (
              <Link href="/admin/invite" className={itemClass}>
                Members
              </Link>
            )}
            <form action={signOut}>
              <button type="submit" className={`w-full ${itemClass}`}>
                Sign out
              </button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}
