import Link from "next/link";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/Gallery";
import { MessageSellerForm } from "@/components/MessageSellerForm";
import { ThreadRow } from "@/components/ThreadRow";
import { smallButtonClass } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { getListing, imagePublicUrl, sortedImages } from "@/lib/listings";
import { getThreadsForListing } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === listing.seller_id;

  const urls = sortedImages(listing).map((img) =>
    imagePublicUrl(img.storage_path),
  );
  const seller = listing.seller;
  const isSold = listing.status === "sold";

  // No role argument: RLS returns the viewer's own thread to a buyer and every
  // thread to the seller, so this one call covers both views. Nothing is marked
  // read here — that only happens when a thread is actually opened.
  const threads = user ? await getThreadsForListing(listing.id) : [];
  const myThread = threads[0];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to items
      </Link>

      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <Gallery urls={urls} alt={listing.title} />

        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-xl font-semibold text-slate-900 sm:text-2xl">
              {listing.title}
            </h1>
            {isSold && (
              <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Sold
              </span>
            )}
          </div>
          <p className="mt-1 text-xl font-semibold text-gold-700">
            {formatPrice(listing.price_cents)}
          </p>

          {listing.description && (
            <p className="mt-4 whitespace-pre-wrap text-slate-700">
              {listing.description}
            </p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Contact the seller
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {seller?.display_name ?? "A member"}
            </p>
            <div className="mt-2 space-y-1 text-sm">
              {/* break-all: a long address is one unbreakable token and would
                  otherwise push this card past a 375px viewport. */}
              {seller?.contact_email && (
                <a
                  href={`mailto:${seller.contact_email}`}
                  className="block break-all text-slate-700 underline hover:text-slate-900"
                >
                  {seller.contact_email}
                </a>
              )}
              {seller?.contact_phone && (
                <a
                  href={`tel:${seller.contact_phone}`}
                  className="block break-all text-slate-700 underline hover:text-slate-900"
                >
                  {seller.contact_phone}
                </a>
              )}
              {!seller?.contact_email && !seller?.contact_phone && (
                <p className="text-slate-400">
                  No contact info provided.{" "}
                  {isOwner && (
                    <Link href="/profile" className="underline">
                      Add yours
                    </Link>
                  )}
                </p>
              )}
            </div>

            {/* An existing conversation replaces the compose box: a blank box
                would hide the seller's reply and invite the buyer to restate
                themselves. It shows even on a sold item — that's exactly when
                "did they get back to me?" is the live question. */}
            {!isOwner && user && myThread && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Your conversation
                </h3>
                <ThreadRow thread={myThread} viewerId={user.id} />
              </div>
            )}

            {/* Hidden for the owner (messaging yourself) and on sold items. The
                database refuses both cases too — this only avoids offering a
                button that cannot work. */}
            {!isOwner && !isSold && !myThread && (
              <MessageSellerForm listingId={listing.id} />
            )}
          </div>

          {isOwner && user && threads.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Interest in this item
              </h2>
              <ul className="mt-2 space-y-2">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <ThreadRow thread={thread} viewerId={user.id} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isOwner && (
            <Link
              href={`/listings/${listing.id}/edit`}
              className={`mt-4 w-full sm:w-auto ${smallButtonClass}`}
            >
              Edit listing
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
