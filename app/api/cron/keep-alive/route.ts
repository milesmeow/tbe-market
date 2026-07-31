import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { isAuthorizedCronRequest } from "@/lib/cron";
import type { Database } from "@/lib/types";

// Route Handlers are already uncached by default in Next 16 (the default for GET
// changed in v15.0.0-RC), and the database call below would opt out anyway. Stated
// explicitly regardless: a cached keep-alive is a keep-alive that never runs, and
// this should survive someone enabling Cache Components later.
export const dynamic = "force-dynamic";

/**
 * Keep-alive ping. Supabase pauses free projects after ~7 days without database
 * activity, so an external scheduler hits this once a day to keep the project up.
 * See the deploy section of README.md for the cron-job.org / Vercel Cron setup.
 *
 * Reachable without a session — it is listed in `PUBLIC_PATHS` in
 * lib/supabase/middleware.ts, without which the proxy would redirect this to
 * /login and the database would never be touched at all.
 */
export async function GET(request: NextRequest) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Anon key, not the service-role key: an endpoint reachable without a session
  // should not be holding one that bypasses RLS. It doesn't need to — `keep_alive`
  // has no write policy at all, and `record_keep_alive_ping()` is SECURITY DEFINER,
  // so the anon role can bump the timestamp without being able to touch anything
  // else. See supabase/migrations/0005_keep_alive.sql.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // A write rather than a read, so "did this count as activity?" is not a
  // question, and so `last_ping` survives as proof the ping reached Postgres.
  const { data: lastPing, error } = await supabase.rpc("record_keep_alive_ping");

  if (error) {
    // Answer with a non-2xx so the scheduler's own failure alerting actually
    // fires. A route that always returns 200 makes both dashboards decorative.
    console.error("keep-alive ping failed:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, lastPing });
}
