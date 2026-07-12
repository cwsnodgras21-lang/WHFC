import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canAccessAdministration,
  canManageCategories,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type CategoriesPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  categories: CategoryRow[];
  loadError: string | null;
};

export async function getCategoriesPageData(
  supabase: Client,
  session: AppSession
): Promise<CategoriesPageData> {
  const canView = canAccessAdministration(
    session.profile.role,
    session.profile.active
  );
  const canManage = canManageCategories(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view categories.",
      categories: [],
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, active")
    .order("name");

  return {
    canView: true,
    canManage,
    permissionMessage: null,
    categories: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
    })),
    loadError: error?.message ?? null,
  };
}
