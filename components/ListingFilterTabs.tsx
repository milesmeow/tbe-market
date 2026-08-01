import { SegmentedTabs } from "@/components/SegmentedTabs";
import { listingsHref } from "@/lib/listings";
import type { ListingFilter, ListingSort } from "@/lib/listings";

const FILTERS: { value: ListingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
];

/**
 * Status filter for the home grid.
 *
 * Takes the current `sort` so switching filter keeps the member's chosen order —
 * `listingsHref` is what keeps the two controls from clobbering each other.
 */
export function ListingFilterTabs({
  active,
  sort,
}: {
  active: ListingFilter;
  sort: ListingSort;
}) {
  return (
    <SegmentedTabs
      label="Filter items by status"
      active={active}
      options={FILTERS.map((filter) => ({
        ...filter,
        href: listingsHref(filter.value, sort),
      }))}
    />
  );
}
