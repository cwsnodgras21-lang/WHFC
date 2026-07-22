import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageItems, canViewItems } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { buildFormSelectOptions } from "@/lib/reference/form-options";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ItemCatalogRow = {
  id: string;
  itemName: string;
  internalSku: string;
  categoryId: string;
  categoryName: string;
  unitOfMeasureId: string;
  unitName: string;
  unitAbbreviation: string;
  preferredVendorId: string | null;
  vendorName: string | null;
  reorderPoint: number;
  parLevel: number;
  active: boolean;
  trackExpiration: boolean;
  trackLotNumber: boolean;
  expirationWarningDays: number;
  packQuantity: number | null;
  hasTransactions: boolean;
};

export type ItemReferenceOption = {
  id: string;
  label: string;
  active: boolean;
};

export type ReferenceDataSnapshot = {
  categories: Array<{ id: string; name: string; active: boolean }>;
  units: Array<{ id: string; name: string; abbreviation: string; active: boolean }>;
  vendors: Array<{ id: string; name: string; active: boolean }>;
};

export type ItemsPageData = {
  canView: boolean;
  canManage: boolean;
  permissionMessage: string | null;
  items: ItemCatalogRow[];
  referenceData: ReferenceDataSnapshot;
  loadError: string | null;
};

export function buildItemFormOptions(
  referenceData: ReferenceDataSnapshot,
  selected: {
    categoryId?: string | null;
    unitOfMeasureId?: string | null;
    preferredVendorId?: string | null;
  }
): {
  categories: ItemReferenceOption[];
  units: ItemReferenceOption[];
  vendors: ItemReferenceOption[];
} {
  return {
    categories: buildFormSelectOptions(
      referenceData.categories,
      selected.categoryId,
      (row) => row.name
    ),
    units: buildFormSelectOptions(
      referenceData.units,
      selected.unitOfMeasureId,
      (row) => `${row.name} (${row.abbreviation})`
    ),
    vendors: buildFormSelectOptions(
      referenceData.vendors,
      selected.preferredVendorId,
      (row) => row.name
    ),
  };
}

export async function getItemsPageData(
  supabase: Client,
  session: AppSession
): Promise<ItemsPageData> {
  const canView = canViewItems(session.profile.active);
  const canManage = canManageItems(
    session.profile.role,
    session.profile.active
  );

  if (!canView) {
    return {
      canView: false,
      canManage: false,
      permissionMessage: "Your account cannot view the item catalog.",
      items: [],
      referenceData: { categories: [], units: [], vendors: [] },
      loadError: null,
    };
  }

  const [itemsResult, categoriesResult, unitsResult, vendorsResult, txResult] =
    await Promise.all([
      supabase
        .from("items")
        .select(
          "id, item_name, internal_sku, reorder_point, par_level, active, category_id, unit_of_measure_id, preferred_vendor_id, track_expiration, track_lot_number, expiration_warning_days, pack_quantity"
        )
        .order("item_name"),
      supabase.from("categories").select("id, name, active").order("name"),
      supabase
        .from("units_of_measure")
        .select("id, name, abbreviation, active")
        .order("name"),
      supabase.from("vendors").select("id, name, active").order("name"),
      supabase.from("inventory_transactions").select("item_id"),
    ]);

  const errors: string[] = [];
  if (itemsResult.error) errors.push(itemsResult.error.message);
  if (categoriesResult.error) errors.push(categoriesResult.error.message);
  if (unitsResult.error) errors.push(unitsResult.error.message);
  if (vendorsResult.error) errors.push(vendorsResult.error.message);
  if (txResult.error) errors.push(txResult.error.message);

  const categoryMap = new Map(
    (categoriesResult.data ?? []).map((row) => [row.id, row.name])
  );
  const unitMap = new Map(
    (unitsResult.data ?? []).map((row) => [
      row.id,
      { name: row.name, abbreviation: row.abbreviation },
    ])
  );
  const vendorMap = new Map(
    (vendorsResult.data ?? []).map((row) => [row.id, row.name])
  );

  const txItemIds = new Set((txResult.data ?? []).map((row) => row.item_id));

  const referenceData: ReferenceDataSnapshot = {
    categories: categoriesResult.data ?? [],
    units: unitsResult.data ?? [],
    vendors: vendorsResult.data ?? [],
  };

  const items: ItemCatalogRow[] = (itemsResult.data ?? []).map((row) => {
    const unit = unitMap.get(row.unit_of_measure_id);
    return {
      id: row.id,
      itemName: row.item_name,
      internalSku: row.internal_sku,
      categoryId: row.category_id,
      categoryName: categoryMap.get(row.category_id) ?? "—",
      unitOfMeasureId: row.unit_of_measure_id,
      unitName: unit?.name ?? "—",
      unitAbbreviation: unit?.abbreviation ?? "—",
      preferredVendorId: row.preferred_vendor_id,
      vendorName: row.preferred_vendor_id
        ? vendorMap.get(row.preferred_vendor_id) ?? null
        : null,
      reorderPoint: Number(row.reorder_point),
      parLevel: Number(row.par_level),
      active: row.active,
      trackExpiration: row.track_expiration,
      trackLotNumber: row.track_lot_number,
      expirationWarningDays: Number(row.expiration_warning_days),
      packQuantity: row.pack_quantity,
      hasTransactions: txItemIds.has(row.id),
    };
  });

  return {
    canView: true,
    canManage,
    permissionMessage: null,
    items,
    referenceData,
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export function itemToFormDefaults(item: ItemCatalogRow): {
  itemName: string;
  internalSku: string;
  categoryId: string;
  unitOfMeasureId: string;
  preferredVendorId: string;
  reorderPoint: string;
  parLevel: string;
  active: boolean;
  trackExpiration: boolean;
  trackLotNumber: boolean;
  expirationWarningDays: string;
  packQuantity: string;
} {
  return {
    itemName: item.itemName,
    internalSku: item.internalSku,
    categoryId: item.categoryId,
    unitOfMeasureId: item.unitOfMeasureId,
    preferredVendorId: item.preferredVendorId ?? "",
    reorderPoint: String(item.reorderPoint),
    parLevel: String(item.parLevel),
    active: item.active,
    trackExpiration: item.trackExpiration,
    trackLotNumber: item.trackLotNumber,
    expirationWarningDays: String(item.expirationWarningDays),
    packQuantity: item.packQuantity !== null ? String(item.packQuantity) : "",
  };
}
