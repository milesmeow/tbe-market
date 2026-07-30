import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads the user's session from cookies, so queries run AS that user and RLS
 * applies. In Next.js 16 `cookies()` is async, hence the await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where cookies are
            // read-only. The middleware refreshes the session, so this is safe
            // to ignore.
          }
        },
      },
    },
  );
}
