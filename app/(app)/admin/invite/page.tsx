import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";

export default async function AdminInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) redirect("/");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name, contact_email, is_admin, must_change_password, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Members</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Invite a new member
        </h2>
        <InviteForm />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-900">
                  {m.display_name ?? "—"}
                  {m.is_admin && (
                    <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {m.contact_email ?? "—"}
                </td>
                <td className="px-4 py-2">
                  {m.must_change_password ? (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      pending first login
                    </span>
                  ) : (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
                      active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
