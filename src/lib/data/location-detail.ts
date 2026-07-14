import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManagePhysicalCounts,
  canViewLocations,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";
import { locationIdSchema } from "@/lib/validation/location";

type Client = SupabaseClient<Database>;

export type LocationStockRow = {
  itemId: string;
  itemName: string;
  internalSku: string;
  unitAbbreviation: string;
  quantityHere: number;
  totalOnHand: number;
  reorderPoint: number;
  isLow: boolean;
  itemActive: boolean;
};

export type LocationDetailData = {
  canView: boolean;
  canCount: boolean;
  permissionMessage: string | null;
  location: {
    id: string;
    locationName: string;
    room: string | null;
    cabinet: string | null;
    shelf: string | null;
    bin: string | null;
    active: boolean;
  };
  activeCountId: string | null;
  stock: LocationStockRow[];
  loadError: string | null;
};

export async function getLocationDetailData(
  supabase: Client,
  session: AppSession,
  rawLocationId: string
): Promise<LocationDetailData | null> {
  const parsedId = locationIdSchema.safeParse(rawLocationId);
  if (!parsedId.success) {
    return null;
  }
  const locationId = parsedId.data;

  const canView = canViewLocations(session.profile.active);
  const canCount = canManagePhysicalCounts(
    session.profile.role,
    session.profile.active
  );

  const [locationResult, onHandResult, activeCountResult] = await Promise.all([
    supabase
      .from("locations")
      .select("id, location_name, room, cabinet, shelf, bin, active")
      .eq("id", locationId)
      .maybeSingle(),
    supabase
      .from("inventory_on_hand")
      .select("item_id, quantity_on_hand")
      .eq("location_id", locationId),
    supabase
      .from("physical_counts")
      .select("id")
      .eq("location_id", locationId)
      .eq("status", "in_progress")
      .maybeSingle(),
  ]);

  if (locationResult.error || !locationResult.data) {
    return null;
  }

  const location = {
    id: locationResult.data.id,
    locationName: locationResult.data.location_name,
    room: locationResult.data.room,
    cabinet: locationResult.data.cabinet,
    shelf: locationResult.data.shelf,
    bin: locationResult.data.bin,
    active: locationResult.data.active,
  };

  if (!canView) {
    return {
      canView: false,
      canCount: false,
      permissionMessage: "Your account cannot view locations.",
      location,
      activeCountId: null,
      stock: [],
      loadError: null,
    };
  }

  const errors: string[] = [];
  if (onHandResult.error) {
    errors.push(onHandResult.error.message);
  }
  if (activeCountResult.error) {
    errors.push(activeCountResult.error.message);
  }

  const quantityHereByItem = new Map<string, number>();
  for (const row of onHandResult.data ?? []) {
    if (row.item_id) {
      quantityHereByItem.set(row.item_id, Number(row.quantity_on_hand ?? 0));
    }
  }

  const itemIds = [...quantityHereByItem.keys()];
  let stock: LocationStockRow[] = [];

  if (itemIds.length > 0) {
    const [itemsResult, totalsResult] = await Promise.all([
      supabase
        .from("items")
        .select(
          "id, item_name, internal_sku, reorder_point, active, units_of_measure(abbreviation)"
        )
        .in("id", itemIds),
      supabase
        .from("inventory_on_hand")
        .select("item_id, quantity_on_hand")
        .in("item_id", itemIds),
    ]);

    if (itemsResult.error) {
      errors.push(itemsResult.error.message);
    }
    if (totalsResult.error) {
      errors.push(totalsResult.error.message);
    }

    const totalByItem = new Map<string, number>();
    for (const row of totalsResult.data ?? []) {
      if (row.item_id) {
        totalByItem.set(
          row.item_id,
          (totalByItem.get(row.item_id) ?? 0) +
            Number(row.quantity_on_hand ?? 0)
        );
      }
    }

    stock = (itemsResult.data ?? [])
      .map((item) => {
        const totalOnHand = totalByItem.get(item.id) ?? 0;
        const reorderPoint = Number(item.reorder_point ?? 0);
        return {
          itemId: item.id,
          itemName: item.item_name,
          internalSku: item.internal_sku,
          unitAbbreviation: item.units_of_measure?.abbreviation ?? "",
          quantityHere: quantityHereByItem.get(item.id) ?? 0,
          totalOnHand,
          reorderPoint,
          // Same threshold as items_below_reorder_point: clinic-wide total,
          // not per-room, because reorder points are set for the whole clinic.
          isLow: totalOnHand <= reorderPoint,
          itemActive: item.active,
        };
      })
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }

  return {
    canView: true,
    canCount,
    permissionMessage: null,
    location,
    activeCountId: activeCountResult.data?.id ?? null,
    stock,
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}
