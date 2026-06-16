import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types";

/** Paths reachable without being logged in. */
const PUBLIC_PATHS = ["/login", "/auth/callback"];

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Authenticated but not a marketplace member — deny and sign out.
    await supabase.auth.signOut();
    const redirect = redirectTo("/login");
    redirect.cookies.set("auth_error", "not_a_member", { maxAge: 30 });
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
