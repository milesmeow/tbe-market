import { redirect } from "next/navigation";

import { ConfirmButton } from "@/components/ConfirmButton";
import { smallButtonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

import { deleteMember, setMemberActive } from "./actions";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";

/**
 * A member as this page needs it. The card list and the table render the same
 * rows from the same helpers below — see the "Never put a <table> in front of a
 * phone" rule in CLAUDE.md. Keep them fed by shared components so the two views
 * can't disagree about what a member's status is.
 */
type Member = {
  id: string;
  display_name: string | null;
  contact_email: string | null;
  is_admin: boolean;
  must_change_password: boolean;
  deactivated_at: string | null;
};

/** Best available name for a member, for confirmation prompts. */
function memberLabel(m: {
  contact_email: string | null;
  display_name: string | null;
}): string {
  return m.contact_email ?? m.display_name ?? "this member";
}

function MemberName({ member }: { member: Member }) {
  return (
    <>
      {member.display_name ?? "—"}
      {member.is_admin && (
        <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white">
          admin
        </span>
      )}
    </>
  );
}

/* Deactivation outranks the other states: it's the one that determines whether
   they can get in at all. */
function StatusChip({ member }: { member: Member }) {
  if (member.deactivated_at) {
    return (
      <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        deactivated
      </span>
    );
  }
  if (member.must_change_password) {
    return (
      <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
        pending first login
      </span>
    );
  }
  return (
    <span className="inline-block rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
      active
    </span>
  );
}

/**
 * Deactivate/Reactivate + Remove. Admins are deliberately exempt from both —
 * see deleteMember in ./actions.ts for why.
 *
 * `stretch` makes the buttons share the row on the phone card, where there's
 * nothing else competing for the width.
 */
function MemberActions({
  member,
  stretch = false,
}: {
  member: Member;
  stretch?: boolean;
}) {
  if (member.is_admin) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const actionClass = stretch
    ? `${smallButtonClass} w-full`
    : smallButtonClass;
  const removeClass = `${actionClass} border-red-200 text-red-600 hover:bg-red-50`;
  const formClass = stretch ? "flex-1" : undefined;

  return (
    <div className={`flex gap-2 ${stretch ? "" : "justify-end"}`}>
      <form action={setMemberActive} className={formClass}>
        <input type="hidden" name="memberId" value={member.id} />
        <input
          type="hidden"
          name="activate"
          value={member.deactivated_at ? "true" : "false"}
        />
        {member.deactivated_at ? (
          <button type="submit" className={actionClass}>
            Reactivate
          </button>
        ) : (
          <ConfirmButton
            message={`Deactivate ${memberLabel(member)}? They won't be able to sign in and their listings will be hidden. Nothing is deleted — you can reactivate them later.`}
            className={actionClass}
          >
            Deactivate
          </ConfirmButton>
        )}
      </form>
      <form action={deleteMember} className={formClass}>
        <input type="hidden" name="memberId" value={member.id} />
        <ConfirmButton
          message={`Remove ${memberLabel(member)}? Their listings and photos will be deleted too. This cannot be undone.`}
          className={removeClass}
        >
          Remove
        </ConfirmButton>
      </form>
    </div>
  );
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

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Invite a new member
        </h2>
        <InviteForm />
      </div>

      {/* Phone: one card per member. A 4-column table with an email column and
          two action buttons cannot fit 375px. */}
      <ul className="space-y-3 md:hidden">
        {(members ?? []).map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-slate-900">
              <MemberName member={m} />
            </p>
            <p className="mt-0.5 break-all text-sm text-slate-600">
              {m.contact_email ?? "—"}
            </p>
            <div className="mt-2">
              <StatusChip member={m} />
            </div>
            {!m.is_admin && (
              <div className="mt-3">
                <MemberActions member={m} stretch />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Desktop: the table. `overflow-x-auto`, never `overflow-hidden` — the
          latter clips the row actions out of reach instead of scrolling to them. */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
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
                  <MemberName member={m} />
                </td>
                <td className="break-all px-4 py-2 text-slate-600">
                  {m.contact_email ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <StatusChip member={m} />
                </td>
                <td className="px-4 py-2">
                  <MemberActions member={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
