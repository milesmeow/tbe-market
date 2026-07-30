import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, contact_email, contact_phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Your profile</h1>
      <p className="mb-4 text-sm text-slate-500">
        Signed in as {user.email}
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProfileForm
          defaults={{
            display_name: profile?.display_name ?? "",
            contact_email: profile?.contact_email ?? "",
            contact_phone: profile?.contact_phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
