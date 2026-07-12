import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];

export type AppUser = {
  id: string;
  email?: string | null;
};

export type AppSession = {
  user: AppUser;
  profile: UserProfile;
};

export async function requireSession(): Promise<AppSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Profile not found for authenticated user.");
  }

  if (!profile.active) {
    redirect("/login");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  };
}

/** @deprecated Use requireSession for profile-aware layouts. */
export async function requireUser(): Promise<{ user: AppUser }> {
  const session = await requireSession();
  return { user: session.user };
}

export async function getSessionUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}
