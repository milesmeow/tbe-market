import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";

/**
 * Supabase client for use in Client Components ("use client").
 * Uses the public anon key — safe to expose to the browser. RLS enforces
 * what the logged-in user is allowed to see/do.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
