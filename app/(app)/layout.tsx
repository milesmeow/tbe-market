import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MobileNav } from "@/components/MobileNav";
import { UnreadBadge } from "@/components/UnreadBadge";
import { navLinkClass } from "@/components/ui";
import { APP_NAME } from "@/lib/config";
import { unreadThreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards these routes, but guard here too as defense.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  // Returns 0 rather than throwing if the messaging migration hasn't been applied
  // yet — a missing badge beats every signed-in page failing on version skew.
  const unread = await unreadThreadCount();

  return (
    // flex-1, not min-h-screen: claims the space left over by the root layout's
    // footer instead of demanding a full viewport and pushing it below the fold.
    <div className="flex-1">
      {/* `relative` anchors MobileNav's dropdown panel, which drops from
          `top-full` of the whole header rather than of the button. */}
      <header className="relative border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:gap-4 sm:py-3">
          {/* min-w-0 + truncate: without them the brand refuses to shrink and
              pushes the nav past a 375px viewport. */}
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <Image
              src="/tbe-logo.png"
              alt="Temple Beth El"
              width={36}
              height={36}
              className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
              priority
            />
            <span className="truncate font-serif text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {APP_NAME}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
            {/* Posting is the primary action, so it stays in the bar at every
                width — only its label shortens. */}
            <Link
              href="/listings/new"
              className="inline-flex min-h-11 touch-manipulation items-center rounded-lg bg-gold-500 px-3 font-medium text-slate-900 shadow-sm transition hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
            >
              <span className="sm:hidden">+ Post</span>
              <span className="hidden sm:inline">+ Post item</span>
            </Link>

            {/* Desktop cluster. Its mobile counterpart is <MobileNav> below —
                any nav item added here needs adding there too. */}
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/messages" className={navLinkClass}>
                Messages
                <UnreadBadge count={unread} />
              </Link>
              <Link href="/profile" className={navLinkClass}>
                Profile
              </Link>
              {profile.is_admin && (
                <Link href="/admin/invite" className={navLinkClass}>
                  Members
                </Link>
              )}
              <form action={signOut}>
                <button type="submit" className={navLinkClass}>
                  Sign out
                </button>
              </form>
            </div>

            <MobileNav
              isAdmin={!!profile.is_admin}
              unread={unread}
              signOut={signOut}
            />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">{children}</main>
    </div>
  );
}
