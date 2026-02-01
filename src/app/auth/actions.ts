"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/db/workspaces";
import type { AuthFormState } from "@/lib/types";

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  redirect(data.url);
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required.", success: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, success: null };
  }

  const user = data.user;
  const displayName = user.user_metadata?.full_name || email.split("@")[0];
  const workspace = await getOrCreateWorkspace(user.id, displayName);

  redirect(`/w/${workspace.id}`);
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password) {
    return { error: "Email and password are required.", success: null };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", success: null };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", success: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message, success: null };
  }

  const user = data.user;
  if (!user) {
    return { error: "Sign up failed. Please try again.", success: null };
  }

  const displayName = email.split("@")[0];
  const workspace = await getOrCreateWorkspace(user.id, displayName);

  redirect(`/w/${workspace.id}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
