"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { APP_NAME, APP_URL } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface InviteFormState {
  error?: string;
  success?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Generate a readable, reasonably strong temporary password. */
function generateTempPassword(): string {
  // 9 url-safe bytes -> 12 chars, plus guaranteed digit/symbol variety.
  const core = randomBytes(9).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
  return `${core}7x!`;
}

/** Confirm the caller is an authenticated admin. */
async function callerIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(profile?.is_admin);
}

async function sendInviteEmail(email: string, tempPassword: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email is not configured (RESEND_API_KEY / EMAIL_FROM).");
  }

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
  if (!(await callerIsAdmin())) {
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

  try {
    await sendInviteEmail(email, tempPassword);
  } catch {
    return {
      error:
        `Account created, but the email failed to send. ` +
        `Share these manually — Email: ${email}, Temp password: ${tempPassword}`,
    };
  }

  revalidatePath("/admin/invite");
  return { success: `Invitation sent to ${email}.` };
}
