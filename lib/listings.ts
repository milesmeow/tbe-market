import { LISTING_IMAGES_BUCKET } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { ListingWithDetails } from "@/lib/types";

/** Build the public URL for a stored listing image (bucket is public-read). */
export function imagePublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${storagePath}`;
}

// Embeds images and the seller profile via the foreign keys.
const LISTING_SELECT =
  "*, listing_images(*), seller:profiles!listings_seller_id_fkey(id, display_name, contact_email, contact_phone)";

/** All listings for the marketplace home, active first then sold, newest first. */
export async function getListings(): Promise<ListingWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .order("status", { ascending: true }) // 'active' < 'sold'
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ListingWithDetails[];
}

/** A single listing with images and seller, or null if not found. */
export async function getListing(
  id: string,
): Promise<ListingWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as ListingWithDetails) ?? null;
}

/** Sort a listing's images by their stored position. */
export function sortedImages(listing: ListingWithDetails) {
  return [...(listing.listing_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );
}
