import { redirect } from "next/navigation";

import { ConfirmButton } from "@/components/ConfirmButton";
import { createClient } from "@/lib/supabase/server";

import { deleteMember, setMemberActive } from "./actions";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";

/** Best available name for a member, for confirmation prompts. */
function memberLabel(m: {
  contact_email: string | null;
  display_name: string | null;
}): string {
  return m.contact_email ?? m.display_name ?? "this member";
}

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
    .select(
      "id, display_name, contact_email, is_admin, must_change_password, created_at, deactivated_at",
    )
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
              <th className="px-4 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
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
                  {/* Deactivation outranks the other states: it's the one that
                      determines whether they can get in at all. */}
                  {m.deactivated_at ? (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      deactivated
                    </span>
                  ) : m.must_change_password ? (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      pending first login
                    </span>
                  ) : (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
                      active
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {/* Admins are deliberately exempt from both actions — see
                      deleteMember in ./actions.ts for why. */}
                  {m.is_admin ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <form action={setMemberActive}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <input
                          type="hidden"
                          name="activate"
                          value={m.deactivated_at ? "true" : "false"}
                        />
                        {m.deactivated_at ? (
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <ConfirmButton
                            message={`Deactivate ${memberLabel(m)}? They won't be able to sign in and their listings will be hidden. Nothing is deleted — you can reactivate them later.`}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Deactivate
                          </ConfirmButton>
                        )}
                      </form>
                      <form action={deleteMember}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <ConfirmButton
                          message={`Remove ${memberLabel(m)}? Their listings and photos will be deleted too. This cannot be undone.`}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </ConfirmButton>
                      </form>
                    </div>
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
