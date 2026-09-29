"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData) {
  const supabase = await createClient();

  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signUp(formData) {
  const supabase = await createClient();

  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const displayName = formData.get("display_name")?.toString().trim();

  if (!displayName) return { error: "Display name is required" };
  if (!email) return { error: "Email is required" };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) return { error: error.message };

  // Ensure a profile row exists even if the handle_new_user DB trigger didn't fire.
  // Without this, new players show up as anonymous ("Player XXXX") on leaderboards.
  if (data?.user?.id) {
    const admin = createAdminClient();
    await admin
      .from("survivor_profiles")
      .upsert({ id: data.user.id, display_name: displayName }, { onConflict: "id" });
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
