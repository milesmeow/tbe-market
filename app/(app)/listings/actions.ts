"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { LISTING_IMAGES_BUCKET, MAX_IMAGES_PER_LISTING } from "@/lib/config";
import { parsePriceToCents } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export interface ListingFormState {
  error?: string;
}

type DB = SupabaseClient<Database>;

function fileExt(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "jpg";
}

/** Upload image files for a listing, returning {storage_path, position} rows. */
async function uploadImages(
  supabase: DB,
  userId: string,
  listingId: string,
  files: File[],
  startPosition: number,
): Promise<{ listing_id: string; storage_path: string; position: number }[]> {
  const rows: {
    listing_id: string;
    storage_path: string;
    position: number;
  }[] = [];

  let position = startPosition;
  for (const file of files) {
    if (file.size === 0) continue;
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.");
    }
    const path = `${userId}/${listingId}/${randomUUID()}.${fileExt(file.name)}`;
    const { error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    rows.push({ listing_id: listingId, storage_path: path, position });
    position += 1;
  }
  return rows;
}

/** Collect non-empty image files from form data, capped at the max. */
function imageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
    .slice(0, MAX_IMAGES_PER_LISTING);
}

export async function createListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isFree = formData.get("free") != null;
  const priceCents = isFree
    ? 0
    : parsePriceToCents(String(formData.get("price") ?? ""));
  const files = imageFiles(formData);

  if (!title) return { error: "Please enter a title." };
  if (priceCents === null) return { error: "Please enter a valid price." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      title,
      description: description || null,
      price_cents: priceCents,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError || !listing) {
    return { error: "Could not create the listing. Please try again." };
  }

  try {
    const imageRows = await uploadImages(
      supabase,
      user.id,
      listing.id,
      files,
      0,
    );
    if (imageRows.length > 0) {
      await supabase.from("listing_images").insert(imageRows);
    }
  } catch {
    // Roll back the listing so we don't leave an image-less orphan.
    await supabase.from("listings").delete().eq("id", listing.id);
    return { error: "Could not upload photos. Please try again." };
  }

  redirect(`/listings/${listing.id}`);
}

/** Verify the current user owns the listing; returns user id or redirects. */
async function requireOwner(supabase: DB, listingId: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.seller_id !== user.id) {
    redirect("/");
  }
  return user.id;
}

export async function updateListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isFree = formData.get("free") != null;
  const priceCents = isFree
    ? 0
    : parsePriceToCents(String(formData.get("price") ?? ""));
  const files = imageFiles(formData);

  if (!id) redirect("/");
  if (!title) return { error: "Please enter a title." };
  if (priceCents === null) return { error: "Please enter a valid price." };

  const supabase = await createClient();
  const userId = await requireOwner(supabase, id);

  const { error } = await supabase
    .from("listings")
    .update({
      title,
      description: description || null,
      price_cents: priceCents,
    })
    .eq("id", id);

  if (error) return { error: "Could not save changes. Please try again." };

  if (files.length > 0) {
    const { count } = await supabase
      .from("listing_images")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", id);
    try {
      const rows = await uploadImages(
        supabase,
        userId,
        id,
        files,
        count ?? 0,
      );
      if (rows.length > 0) {
        await supabase.from("listing_images").insert(rows);
      }
    } catch {
      return { error: "Saved details, but photos failed to upload." };
    }
  }

  redirect(`/listings/${id}`);
}

export async function setListingStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "sold" ? "sold" : "active";
  if (!id) redirect("/");

  const supabase = await createClient();
  await requireOwner(supabase, id);
  await supabase.from("listings").update({ status }).eq("id", id);

  revalidatePath(`/listings/${id}`);
  revalidatePath("/");
}

export async function deleteListingImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  if (!imageId || !listingId) redirect("/");

  const supabase = await createClient();
  await requireOwner(supabase, listingId);

  const { data: image } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("id", imageId)
    .maybeSingle();

  if (image) {
    await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove([image.storage_path]);
    await supabase.from("listing_images").delete().eq("id", imageId);
  }

  revalidatePath(`/listings/${listingId}/edit`);
}

export async function deleteListing(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");

  const supabase = await createClient();
  await requireOwner(supabase, id);

  // Remove stored images, then the row (cascade clears listing_images rows).
  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", id);

  if (images && images.length > 0) {
    await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove(images.map((i) => i.storage_path));
  }

  await supabase.from("listings").delete().eq("id", id);

  revalidatePath("/");
  redirect("/");
}
