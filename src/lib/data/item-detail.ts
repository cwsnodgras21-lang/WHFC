import type { SupabaseClient } from "@supabase/supabase-js";

import { canViewItems } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ItemLocationStockRow = {
  locationId: string;
  locationName: string;
  quantityOnHand: number;
};

export type ItemDetailData = {
  found: boolean;
  canView: boolean;
  permissionMessage: string | null;
  itemId: string;
  itemName: string;
  internalSku: string;
  categoryName: string;
  unitName: string;
  unitAbbreviation: string;
  vendorName: string | null;
  reorderPoint: number;
  parLevel: number;
  packQuantity: number | null;
  active: boolean;
  totalOnHand: number;
  locationStock: ItemLocationStockRow[];
  loadError: string | null;
};

export async function getItemDetailData(
  supabase: Client,
  session: AppSession,
  itemId: string
): Promise<ItemDetailData | null> {
  const canView = canViewItems(session.profile.active);

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select(
      "id, item_name, internal_sku, reorder_point, par_level, pack_quantity, active, categories(name), units_of_measure(name, abbreviation), vendors(name)"
    )
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    return {
      found: true,
      canView,
      permissionMessage: null,
      itemId,
      itemName: "",
      internalSku: "",
      categoryName: "—",
      unitName: "",
      unitAbbreviation: "",
      vendorName: null,
      reorderPoint: 0,
      parLevel: 0,
      packQuantity: null,
      active: false,
      totalOnHand: 0,
      locationStock: [],
      loadError: itemError.message,
    };
  }

  if (!item) {
    return null;
  }

  if (!canView) {
    return {
      found: true,
      canView: false,
      permissionMessage: "Your account cannot view the item catalog.",
      itemId: item.id,
      itemName: item.item_name,
      internalSku: item.internal_sku,
      categoryName: "—",
      unitName: "",
      unitAbbreviation: "",
      vendorName: null,
      reorderPoint: 0,
      parLevel: 0,
      packQuantity: null,
      active: item.active,
      totalOnHand: 0,
      locationStock: [],
      loadError: null,
    };
  }

  const category = item.categories as { name?: string } | null;
  const unit = item.units_of_measure as {
    name?: string;
    abbreviation?: string;
  } | null;
  const vendor = item.vendors as { name?: string } | null;

  const { data: onHandRows, error: onHandError } = await supabase
    .from("inventory_on_hand")
    .select("location_id, quantity_on_hand")
    .eq("item_id", itemId);

  const nonZeroRows = (onHandRows ?? []).filter(
    (row) => row.location_id && Number(row.quantity_on_hand ?? 0) !== 0
  );

  const locationIds = [
    ...new Set(nonZeroRows.map((row) => row.location_id as string)),
  ];

  let locationNameMap = new Map<string, string>();
  let locationsError: string | null = null;
  if (locationIds.length > 0) {
    const { data: locationRows, error: locationsErr } = await supabase
      .from("locations")
      .select("id, location_name")
      .in("id", locationIds);
    locationsError = locationsErr?.message ?? null;
    locationNameMap = new Map(
      (locationRows ?? []).map((row) => [row.id, row.location_name])
    );
  }

  const locationStock: ItemLocationStockRow[] = nonZeroRows
    .map((row) => ({
      locationId: row.location_id as string,
      locationName:
        locationNameMap.get(row.location_id as string) ?? "Unknown location",
      quantityOnHand: Number(row.quantity_on_hand ?? 0),
    }))
    .sort((a, b) => a.locationName.localeCompare(b.locationName));

  const totalOnHand = locationStock.reduce(
    (sum, row) => sum + row.quantityOnHand,
    0
  );

  return {
    found: true,
    canView: true,
    permissionMessage: null,
    itemId: item.id,
    itemName: item.item_name,
    internalSku: item.internal_sku,
    categoryName: category?.name ?? "—",
    unitName: unit?.name ?? "—",
    unitAbbreviation: unit?.abbreviation ?? "—",
    vendorName: vendor?.name ?? null,
    reorderPoint: Number(item.reorder_point),
    parLevel: Number(item.par_level),
    packQuantity: item.pack_quantity,
    active: item.active,
    totalOnHand,
    locationStock,
    loadError: onHandError?.message ?? locationsError ?? null,
  };
}
