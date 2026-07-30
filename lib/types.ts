/**
 * Hand-authored database types. They mirror the SQL migration in
 * `supabase/migrations`. If you change the schema, update these to match
 * (or regenerate with `supabase gen types typescript`).
 */

export type ListingStatus = "active" | "sold";

// NOTE: these MUST be `type` aliases, not `interface`. supabase-js constrains
// each table Row to `Record<string, unknown>`, and only type aliases get the
// implicit index signature that satisfies it — interfaces would degrade every
// query result to `never`.
export type Profile = {
  id: string;
  display_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_admin: boolean;
  must_change_password: boolean;
  created_at: string;
  /** Set when the member is deactivated; null means active. See 0002 migration. */
  deactivated_at: string | null;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  position: number;
};

/** A listing joined with its images and seller profile, used by the UI. */
export type ListingWithDetails = Listing & {
  listing_images: ListingImage[];
  seller: Pick<
    Profile,
    "id" | "display_name" | "contact_email" | "contact_phone"
  > | null;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: Omit<Listing, "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Omit<Listing, "id" | "seller_id" | "created_at">>;
        Relationships: [];
      };
      listing_images: {
        Row: ListingImage;
        Insert: Omit<ListingImage, "id"> & { id?: string };
        Update: Partial<Omit<ListingImage, "id" | "listing_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { listing_status: ListingStatus };
    CompositeTypes: Record<string, never>;
  };
}
