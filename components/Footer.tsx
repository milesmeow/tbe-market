import { APP_VERSION } from "@/lib/version";

/**
 * App-wide footer, rendered once by the root layout so it appears on every page
 * including login.
 *
 * `mt-auto` keeps it pinned to the bottom of the flex column in the root layout
 * even if a page shell forgets to claim the remaining space with `flex-1`.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 py-4">
      <p className="mx-auto max-w-5xl px-4 text-center text-xs text-slate-400">
        v{APP_VERSION}
      </p>
    </footer>
  );
}
