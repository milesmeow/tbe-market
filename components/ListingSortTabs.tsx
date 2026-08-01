import { SegmentedTabs } from "@/components/SegmentedTabs";
import { listingsHref } from "@/lib/listings";
import type { ListingFilter, ListingSort } from "@/lib/listings";

const SORTS: { value: ListingSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

/**
 * Date order for the home grid, newest first by default.
 *
 * Mirrors ListingFilterTabs and takes the current `filter` for the same reason:
 * re-sorting must not throw away the status the member is looking at.
 */
export function ListingSortTabs({
  active,
  filter,
}: {
  active: ListingSort;
  filter: ListingFilter;
}) {
  return (
    <SegmentedTabs
      label="Sort items by date posted"
      active={active}
      options={SORTS.map((sort) => ({
        ...sort,
        href: listingsHref(filter, sort.value),
      }))}
    />
  );
}
