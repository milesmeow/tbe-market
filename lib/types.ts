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

/**
 * A conversation between one buyer and one seller about one listing. The UI only
 * sends one-shot inquiries today, but the schema is thread-shaped so adding replies
 * later needs no migration. See `supabase/migrations/0003_messaging.sql`.
 */
export type MessageThread = {
  id: string;
  /**
   * Null once the listing is deleted — the conversation outlives the item rather
   * than vanishing with it. See `0004_message_replies.sql`.
   */
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  /** Who sent the newest message; keeps the unread badge from counting your own. */
  last_sender_id: string;
  created_at: string;
  last_message_at: string;
  /** Null means never read. Read state is per thread, not per message. */
  buyer_read_at: string | null;
  seller_read_at: string | null;
};

/**
 * Single row (`id` is always 1) whose timestamp the daily cron bumps to keep
 * Supabase from pausing the project. See supabase/migrations/0005_keep_alive.sql.
 */
export type KeepAlive = {
  id: number;
  last_ping: string;
};

/** Append-only: there is no update or delete path for messages anywhere. */
export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** The subset of a profile the UI shows so one member can reach another. */
export type ContactProfile = Pick<
  Profile,
  "id" | "display_name" | "contact_email" | "contact_phone"
>;

/** A listing joined with its images and seller profile, used by the UI. */
export type ListingWithDetails = Listing & {
  listing_images: ListingImage[];
  seller: ContactProfile | null;
};

/**
 * A thread joined with its listing, its messages, and both parties' contact details.
 * Both parties are embedded because the inbox shows whichever one *isn't* you, and
 * that differs between the received and sent lists.
 */
export type ThreadWithDetails = MessageThread & {
  listing: Pick<Listing, "id" | "title" | "price_cents" | "status"> | null;
  messages: Message[];
  buyer: ContactProfile | null;
  seller: ContactProfile | null;
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
      // Both message tables are read-only to the app: RLS grants select and nothing
      // else, and every write goes through the RPCs below. The Insert/Update shapes
      // exist to satisfy the client's table type and are unused in practice.
      message_threads: {
        Row: MessageThread;
        Insert: Omit<MessageThread, "id" | "created_at"> & { id?: string };
        Update: Partial<Pick<MessageThread, "buyer_read_at" | "seller_read_at">>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at"> & { id?: string };
        Update: never;
        Relationships: [];
      };
      // Singleton row bumped by the daily keep-alive cron. Same arrangement as
      // the message tables: select-only, written solely by an RPC.
      keep_alive: {
        Row: KeepAlive;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** Starts (or adds to) a thread about a listing. Raises on any rejection. */
      send_listing_message: {
        Args: { p_listing_id: string; p_body: string };
        Returns: string;
      };
      /**
       * Posts to an existing thread. Unlike send_listing_message this ignores the
       * listing's status, so a seller can still answer after marking it sold.
       */
      reply_to_thread: {
        Args: { p_thread_id: string; p_body: string };
        Returns: string;
      };
      /** Stamps the caller's own side of one thread as read. */
      mark_thread_read: { Args: { p_thread_id: string }; Returns: undefined };
      /** Threads with activity the caller hasn't seen — powers the nav badge. */
      unread_thread_count: { Args: Record<string, never>; Returns: number };
      /**
       * Bumps the keep-alive row so Supabase sees database activity and doesn't
       * pause the project. Returns the new timestamp. Callable by anon — the
       * cron route has no session.
       */
      record_keep_alive_ping: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: { listing_status: ListingStatus };
    CompositeTypes: Record<string, never>;
  };
}
