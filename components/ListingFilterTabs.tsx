import Link from "next/link";

import type { ListingFilter } from "@/lib/listings";

const TABS: { value: ListingFilter; label: string; href: string }[] = [
  { value: "all", label: "All", href: "/" },
  { value: "available", label: "Available", href: "/?status=available" },
  { value: "sold", label: "Sold", href: "/?status=sold" },
];

/**
 * Status filter for the home grid.
 *
 * Plain links over a client component with state: the filter lives in the URL, so
 * a filtered view can be shared, bookmarked and reached by the back button, and
 * the page stays entirely server-rendered. "All" is the bare path rather than
 * `?status=all`, so the default view has one canonical URL.
 */
export function ListingFilterTabs({ active }: { active: ListingFilter }) {
  return (
    <nav
      aria-label="Filter items by status"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
