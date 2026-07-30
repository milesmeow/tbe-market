import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/**
 * Privileged Supabase client using the service-role key.
 *
 * WARNING: This key BYPASSES Row Level Security. Only use it in trusted
 * server-side code (Server Actions / Route Handlers) for admin operations like
 * inviting members. The `server-only` import above makes the build fail if this
 * file is ever imported into a Client Component.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
