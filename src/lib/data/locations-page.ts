import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageLocations, canViewLocations } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type LocationRow = {
  id: string;
  locationName: string;
  room: string | null;
  cabinet: string | null;
  shelf: string | null;
  bin: string | null;
  active: boolean;
  hasTransactions: boolean;
};

export type LocationsPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  locations: LocationRow[];
  loadError: string | null;
};

export async function getLocationsPageData(
  supabase: Client,
  session: AppSession
): Promise<LocationsPageData> {
  const canView = canViewLocations(session.profile.active);
  const canManage = canManageLocations(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view locations.",
      locations: [],
      loadError: null,
    };
  }

  const [locationsResult, txResult] = await Promise.all([
    supabase
      .from("locations")
      .select("id, location_name, room, cabinet, shelf, bin, active")
      .order("active", { ascending: false })
      .order("location_name"),
    supabase.from("inventory_transactions").select("location_id"),
  ]);

  const errors: string[] = [];
  if (locationsResult.error) {
    errors.push(locationsResult.error.message);
  }
  if (txResult.error) {
    errors.push(txResult.error.message);
  }

  const txLocationIds = new Set(
    (txResult.data ?? []).map((row) => row.location_id)
  );

  return {
    canView: true,
    canManage,
    permissionMessage: null,
    locations: (locationsResult.data ?? []).map((row) => ({
      id: row.id,
      locationName: row.location_name,
      room: row.room,
      cabinet: row.cabinet,
      shelf: row.shelf,
      bin: row.bin,
      active: row.active,
      hasTransactions: txLocationIds.has(row.id),
    })),
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export function locationToFormDefaults(location: LocationRow) {
  return {
    locationName: location.locationName,
    room: location.room ?? "",
    cabinet: location.cabinet ?? "",
    shelf: location.shelf ?? "",
    bin: location.bin ?? "",
    active: location.active,
  };
}
