"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ProfileFormState {
  error?: string;
  success?: boolean;
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();

  if (!displayName) {
    return { error: "Please enter a display name." };
  }
  if (!contactEmail && !contactPhone) {
    return { error: "Add at least one way for buyers to reach you." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  return { success: true };
}
