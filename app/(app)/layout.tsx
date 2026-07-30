import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { APP_NAME } from "@/lib/config";
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

  return (
    // flex-1, not min-h-screen: claims the space left over by the root layout's
    // footer instead of demanding a full viewport and pushing it below the fold.
    <div className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/tbe-logo.png"
              alt="Temple Beth El"
              width={36}
              height={36}
              className="h-9 w-9"
              priority
            />
            <span className="font-serif text-xl font-semibold tracking-tight text-slate-900">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/listings/new"
              className="rounded-lg bg-gold-500 px-3 py-1.5 font-medium text-slate-900 shadow-sm transition hover:bg-gold-400"
            >
              + Post item
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
            >
              Profile
            </Link>
            {profile.is_admin && (
              <Link
                href="/admin/invite"
                className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
              >
                Members
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
