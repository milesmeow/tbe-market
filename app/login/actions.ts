"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // The credentials are valid, but the account may no longer be usable. Checking
  // here rather than letting the proxy bounce them is what makes an explanation
  // possible — a redirect to /login would just look like the password failed.
  // Readable even when deactivated, via the profiles_select_own policy (0002).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("deactivated_at")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    // Distinguished from "no row" on purpose: a failed query says nothing about
    // this account, so don't accuse the member of not being one. Reporting it as
    // a server-side problem is both accurate and diagnosable.
    await supabase.auth.signOut();
    return { error: "Couldn't verify your account right now. Please try again." };
  }

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account isn't a member of the marketplace." };
  }

  if (profile.deactivated_at) {
    await supabase.auth.signOut();
    return {
      error:
        "This account has been deactivated. Contact an administrator to restore it.",
    };
  }

  // Middleware will route to /auth/change-password if this is a first login.
  redirect("/");
}
