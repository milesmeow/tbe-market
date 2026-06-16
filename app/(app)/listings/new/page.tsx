import Link from "next/link";

import { ListingForm } from "@/components/ListingForm";
import { createListing } from "../actions";

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-semibold text-slate-900">
        Post an item
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ListingForm
          action={createListing}
          submitLabel="Post item"
          photosRequired={false}
          photosLabel="Photos (optional)"
        />
      </div>
    </div>
  );
}
