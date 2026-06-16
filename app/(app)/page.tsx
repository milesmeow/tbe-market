import Link from "next/link";

import { ListingCard } from "@/components/ListingCard";
import { primaryButtonClass } from "@/components/ui";
import { getListings } from "@/lib/listings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listings = await getListings();

  if (listings.length === 0) {
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
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Items for sale
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </>
  );
}
