import Link from "next/link";

import { ListingCard } from "@/components/ListingCard";
import { ListingFilterTabs } from "@/components/ListingFilterTabs";
import { primaryButtonClass } from "@/components/ui";
import { getListings, parseListingFilter } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filter = parseListingFilter((await searchParams).status);
  const listings = await getListings(filter);

  // An empty marketplace and an empty filter need different answers: "be the
  // first to list something" is wrong when there are twenty sold items and you
  // just asked for available ones.
  const marketplaceIsEmpty = filter === "all" && listings.length === 0;

  if (marketplaceIsEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h2 className="text-lg font-medium text-slate-900">No items yet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Be the first to list something for the community.
        </p>
        <Link href="/listings/new" className={`mt-4 ${primaryButtonClass}`}>
          Post an item
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Items</h1>
        {/* Rendered even when the filter matches nothing — otherwise there'd be
            no way back to All from an empty result. */}
        <ListingFilterTabs active={filter} />
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            {filter === "available"
              ? "Nothing is available right now — every item has been sold."
              : "Nothing has been marked sold yet."}
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm text-slate-600 underline hover:text-slate-900"
          >
            Show all items
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </>
  );
}
