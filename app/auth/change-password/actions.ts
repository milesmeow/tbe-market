"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface ChangePasswordState {
  error?: string;
}

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  // Clear the first-login flag so middleware stops forcing this page.
  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  redirect("/");
}
