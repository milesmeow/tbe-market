import Link from "next/link";

export type SegmentedTabOption = {
  /** Stable key — also the `?param=` value the option stands for. */
  value: string;
  label: string;
  href: string;
};

/**
 * A row of mutually exclusive link options, one of them current.
 *
 * Plain links over a client component with state: the choice lives in the URL, so
 * a filtered or re-sorted view can be shared, bookmarked and reached by the back
 * button, and the page stays entirely server-rendered.
 *
 * Shared by ListingFilterTabs and ListingSortTabs so the 44px touch target
 * (see CLAUDE.md) is defined once instead of once per control.
 */
export function SegmentedTabs({
  label,
  options,
  active,
}: {
  label: string;
  options: SegmentedTabOption[];
  active: string;
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
    >
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 touch-manipulation items-center justify-center rounded-md px-3 text-sm font-medium ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
