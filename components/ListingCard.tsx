import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { imagePublicUrl, sortedImages } from "@/lib/listings";
import type { ListingWithDetails } from "@/lib/types";

/** A single listing tile for the home grid. */
export function ListingCard({ listing }: { listing: ListingWithDetails }) {
  const cover = sortedImages(listing)[0];
  const isSold = listing.status === "sold";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePublicUrl(cover.storage_path)}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No photo
          </div>
        )}
        {isSold && (
          <span className="absolute left-2 top-2 rounded-md bg-slate-900/85 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Sold
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium text-slate-900">{listing.title}</p>
        <p className="text-sm font-semibold text-gold-700">
          {formatPrice(listing.price_cents)}
        </p>
      </div>
    </Link>
  );
}
