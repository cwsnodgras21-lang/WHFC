import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canAccessAdministration,
  canManageUnits,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type UnitRow = {
  id: string;
  name: string;
  abbreviation: string;
  active: boolean;
};

export type UnitsPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  units: UnitRow[];
  loadError: string | null;
};

export async function getUnitsPageData(
  supabase: Client,
  session: AppSession
): Promise<UnitsPageData> {
  const canView = canAccessAdministration(
    session.profile.role,
    session.profile.active
  );
  const canManage = canManageUnits(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view units of measure.",
      units: [],
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("units_of_measure")
    .select("id, name, abbreviation, active")
    .order("name");

  return {
    canView: true,
    canManage,
    permissionMessage: canManage
      ? null
      : "You can view units of measure. Only administrators can create or edit them.",
    units: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      active: row.active,
    })),
    loadError: error?.message ?? null,
  };
}
