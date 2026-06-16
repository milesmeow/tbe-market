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
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/listings/new"
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
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
