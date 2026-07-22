import type { SupabaseClient } from "@supabase/supabase-js";

import { canAccessAdministration, canManageVendors } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type VendorRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  active: boolean;
};

export type VendorsPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  vendors: VendorRow[];
  loadError: string | null;
};

export async function getVendorsPageData(
  supabase: Client,
  session: AppSession
): Promise<VendorsPageData> {
  const canView = canAccessAdministration(
    session.profile.role,
    session.profile.active
  );
  const canManage = canManageVendors(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view vendors.",
      vendors: [],
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, contact_email, contact_phone, website, active")
    .order("name");

  return {
    canView: true,
    canManage,
    permissionMessage: null,
    vendors: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      website: row.website,
      active: row.active,
    })),
    loadError: error?.message ?? null,
  };
}
