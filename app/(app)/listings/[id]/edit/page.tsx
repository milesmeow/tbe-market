import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ConfirmButton } from "@/components/ConfirmButton";
import { ListingForm } from "@/components/ListingForm";
import { getListing, imagePublicUrl, sortedImages } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

import {
  deleteListing,
  deleteListingImage,
  setListingStatus,
  updateListing,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
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
  if (!user || user.id !== listing.seller_id) {
    redirect(`/listings/${id}`);
  }

  const images = sortedImages(listing);
  const isSold = listing.status === "sold";

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/listings/${id}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-semibold text-slate-900">
        Edit listing
      </h1>

      {/* Status + delete controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <form action={setListingStatus}>
          <input type="hidden" name="id" value={id} />
          <input
            type="hidden"
            name="status"
            value={isSold ? "active" : "sold"}
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isSold ? "Mark as available" : "Mark as sold"}
          </button>
        </form>
        <span className="text-sm text-slate-500">
          Status:{" "}
          <span className="font-medium text-slate-700">
            {isSold ? "Sold" : "Available"}
          </span>
        </span>
        <form action={deleteListing} className="ml-auto">
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            message="Delete this listing and its photos? This cannot be undone."
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete listing
          </ConfirmButton>
        </form>
      </div>

      {/* Existing photos */}
      {images.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Current photos
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePublicUrl(img.storage_path)}
                  alt="listing photo"
                  className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                />
                <form action={deleteListingImage} className="absolute right-1 top-1">
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="listingId" value={id} />
                  <ConfirmButton
                    message="Remove this photo?"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-xs text-white hover:bg-slate-900"
                  >
                    ✕
                  </ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details form (photos optional here — adds more) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ListingForm
          action={updateListing}
          submitLabel="Save changes"
          photosRequired={false}
          photosLabel="Add more photos"
          defaults={{
            id,
            title: listing.title,
            description: listing.description ?? "",
            price: (listing.price_cents / 100).toFixed(2),
          }}
        />
      </div>
    </div>
  );
}
