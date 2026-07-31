import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types";

/**
 * Paths reachable without being logged in.
 *
 * `/api/cron/keep-alive` is listed as an exact path rather than `/api/cron`,
 * because `isPublic()` also prefix-matches: the shorter entry would quietly make
 * every future route in that namespace public. It is the only unauthenticated
 * route in the app, and `CRON_SECRET` is the entire control on it.
 */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/cron/keep-alive"];

const CHANGE_PASSWORD_PATH = "/auth/change-password";

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Refreshes the Supabase session on every request and enforces access rules:
 *  - not logged in           -> /login
 *  - logged in, no profile   -> sign out (not a member)
 *  - deactivated member      -> sign out
 *  - must change password    -> /auth/change-password
 *  - already logged in on /login -> home
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase and must be called
  // to keep the session fresh. Do not run code between createServerClient and here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Carry over refreshed auth cookies onto any redirect we return.
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user) {
    return isPublic(pathname) ? response : redirectTo("/login");
  }

  // Logged in: confirm membership and password status.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("must_change_password, deactivated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    // The query failed, which is a verdict about the database and not about this
    // user — so deny access, but leave the session intact. Signing out here would
    // turn any transient Supabase fault (or a schema/code version skew, e.g. this
    // code deployed before the 0002 migration) into a full lockout that outlives
    // the fault. Denying without signing out self-heals once the cause is fixed.
    return isPublic(pathname) ? response : redirectTo("/login");
  }

  if (!profile) {
    // Authenticated but not a marketplace member — deny and sign out.
    await supabase.auth.signOut();
    const redirect = redirectTo("/login");
    redirect.cookies.set("auth_error", "not_a_member", { maxAge: 30 });
    return redirect;
  }

  if (profile.deactivated_at) {
    // Deactivated mid-session. RLS already denies them everything, so this only
    // decides *how* they find out: a bounce to /login rather than an app shell
    // full of empty states. The login action explains why on their next attempt.
    await supabase.auth.signOut();
    const redirect = redirectTo("/login");
    redirect.cookies.set("auth_error", "deactivated", { maxAge: 30 });
    return redirect;
  }

  if (profile.must_change_password && pathname !== CHANGE_PASSWORD_PATH) {
    return redirectTo(CHANGE_PASSWORD_PATH);
  }

  if (pathname === "/login") {
    return redirectTo("/");
  }

  return response;
}
