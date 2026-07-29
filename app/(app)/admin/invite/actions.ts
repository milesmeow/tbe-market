"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { APP_NAME, APP_URL, LISTING_IMAGES_BUCKET } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Sign-in details to hand to a new member when email can't deliver them. */
export interface InviteCredentials {
  loginUrl: string;
  email: string;
  tempPassword: string;
}

export interface InviteFormState {
  error?: string;
  success?: string;
  /**
   * Present whenever the invite email did not deliver the password — either
   * because email is switched off (the expected setup during testing) or
   * because the send failed. The admin shares these manually.
   */
  credentials?: InviteCredentials;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Generate a readable, reasonably strong temporary password. */
function generateTempPassword(): string {
  // 9 url-safe bytes -> 12 chars, plus guaranteed digit/symbol variety.
  const core = randomBytes(9).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
  return `${core}7x!`;
}

/**
 * Confirm the caller is an authenticated admin, returning their user id.
 *
 * Returns the id rather than a boolean so callers can compare the caller
 * against the row they're acting on — an admin must not delete themselves.
 */
async function callerAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.is_admin ? user.id : null;
}

/**
 * Resend credentials, or null when email is switched off.
 *
 * Running without email is a supported mode, not a misconfiguration: invites
 * then surface the temp password in the admin UI for the admin to pass along.
 * The placeholder from `.env.local.example` counts as "off" so a half-filled
 * local env behaves the same way production does.
 */
function emailConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from || apiKey === "re_your_api_key") return null;
  return { apiKey, from };
}

async function sendInviteEmail(
  config: { apiKey: string; from: string },
  email: string,
  tempPassword: string,
) {
  const { apiKey, from } = config;
  const resend = new Resend(apiKey);
  const loginUrl = `${APP_URL}/login`;

  await resend.emails.send({
    from,
    to: email,
    subject: `You're invited to ${APP_NAME}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2>Welcome to ${APP_NAME}</h2>
        <p>You've been invited to join our community marketplace. Use these
           details to sign in, then you'll be asked to set your own password.</p>
        <p>
          <strong>Sign in:</strong> <a href="${loginUrl}">${loginUrl}</a><br/>
          <strong>Email:</strong> ${email}<br/>
          <strong>Temporary password:</strong>
          <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${tempPassword}</code>
        </p>
        <p style="color:#64748b;font-size:13px;">
          For your security, you'll be required to change this password the first
          time you log in.
        </p>
      </div>
    `,
  });
}

export async function inviteMember(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  if (!(await callerAdminId())) {
    return { error: "Only administrators can invite members." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });

  if (createError || !created.user) {
    const already = createError?.message?.toLowerCase().includes("already");
    return {
      error: already
        ? "That email already has an account."
        : "Could not create the account. Please try again.",
    };
  }

  // Create their marketplace profile (bypasses RLS via service role).
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    display_name: email.split("@")[0],
    contact_email: email,
    is_admin: false,
    must_change_password: true,
  });

  if (profileError) {
    // Roll back the auth user so a retry can succeed cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not set up the member profile. Please try again." };
  }

  // The member exists from here on, whatever happens with email — refresh the
  // list now so every path below shows the new row.
  revalidatePath("/admin/invite");

  const credentials: InviteCredentials = {
    loginUrl: `${APP_URL}/login`,
    email,
    tempPassword,
  };

  const config = emailConfig();
  if (!config) {
    return {
      success: `Account created for ${email}.`,
      credentials,
    };
  }

  try {
    await sendInviteEmail(config, email, tempPassword);
  } catch {
    return {
      error: "Account created, but the invite email failed to send.",
      credentials,
    };
  }

  return { success: `Invitation sent to ${email}.` };
}

/**
 * Deactivate or reactivate a member — the reversible alternative to removal.
 *
 * Nothing is deleted: the profile, listings, and photos stay exactly as they
 * are. Deactivating revokes access (the 0002 migration folds the check into
 * `is_member()`, so RLS denies them everything) and hides their listings from
 * the marketplace. Reactivating restores all of it untouched.
 *
 * Guards mirror deleteMember — no acting on yourself, none on admins — for the
 * same reason: this runs with a service-role client that bypasses RLS, so these
 * checks are the only authorization boundary.
 */
export async function setMemberActive(formData: FormData) {
  const adminId = await callerAdminId();
  if (!adminId) throw new Error("Only administrators can change member access.");

  const memberId = String(formData.get("memberId") ?? "");
  const activate = formData.get("activate") === "true";
  if (!memberId) throw new Error("No member specified.");
  if (memberId === adminId) {
    throw new Error("You cannot change your own account's access.");
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", memberId)
    .maybeSingle();

  if (!target) throw new Error("That member no longer exists.");
  if (target.is_admin) {
    throw new Error("Administrator accounts cannot be deactivated here.");
  }

  const { error } = await admin
    .from("profiles")
    .update({ deactivated_at: activate ? null : new Date().toISOString() })
    .eq("id", memberId);

  if (error) throw new Error("Could not update that member. Please try again.");

  revalidatePath("/admin/invite");
  // Their listings appear or disappear from the marketplace with this flag.
  revalidatePath("/");
}

/**
 * Remove a member: their account, profile, listings, and photos.
 *
 * Admins are protected — the UI hides the button for them, and this refuses
 * again here. That guard is not belt-and-braces politeness: this action holds a
 * service-role client, which bypasses RLS entirely, so these checks are the
 * *only* thing standing between a forged POST and a deleted account. There is
 * also no way back — the app has no password reset and no way to re-grant admin
 * from the UI, so deleting the last admin would lock everyone out of invites
 * permanently.
 *
 * Throws on a refused or failed delete. Every rejection path here is
 * unreachable through the rendered UI, so surfacing an error is more honest
 * than silently doing nothing; on success the row simply disappears.
 */
export async function deleteMember(formData: FormData) {
  const adminId = await callerAdminId();
  if (!adminId) throw new Error("Only administrators can remove members.");

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new Error("No member specified.");
  if (memberId === adminId) throw new Error("You cannot remove your own account.");

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", memberId)
    .maybeSingle();

  if (!target) throw new Error("That member no longer exists.");
  if (target.is_admin) throw new Error("Administrator accounts cannot be removed here.");

  // Read the photo paths *before* deleting — the cascade from auth.users clears
  // listing_images, and once those rows are gone the files are unfindable.
  const { data: listings } = await admin
    .from("listings")
    .select("id")
    .eq("seller_id", memberId);

  let storagePaths: string[] = [];
  if (listings && listings.length > 0) {
    const { data: images } = await admin
      .from("listing_images")
      .select("storage_path")
      .in(
        "listing_id",
        listings.map((l) => l.id),
      );
    storagePaths = (images ?? []).map((i) => i.storage_path);
  }

  // Cascades: auth.users -> profiles -> listings -> listing_images.
  const { error } = await admin.auth.admin.deleteUser(memberId);
  if (error) throw new Error("Could not remove that member. Please try again.");

  // Deliberately after the delete. Storage has no foreign keys, so orphaned
  // files are the failure mode here — a wasted slice of the free-tier quota,
  // preferable to destroying a still-active member's photos if the auth delete
  // had failed.
  if (storagePaths.length > 0) {
    await admin.storage.from(LISTING_IMAGES_BUCKET).remove(storagePaths);
  }

  revalidatePath("/admin/invite");
  revalidatePath("/");
}
