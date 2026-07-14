import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageItems } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ItemVendorSource = {
  id: string;
  vendorId: string;
  vendorName: string;
  isPreferred: boolean;
  vendorSku: string | null;
  manufacturer: string | null;
  manufacturerPartNumber: string | null;
  packSize: string | null;
  typicalOrderQuantity: number | null;
  leadTimeDays: number | null;
  typicalCost: number | null;
  lastOrderDate: string | null;
  orderingNotes: string | null;
  orderingUrl: string | null;
};

export type VendorOption = { id: string; name: string };

export type ItemSourcingData = {
  found: boolean;
  canManage: boolean;
  itemId: string;
  itemName: string;
  internalSku: string;
  sources: ItemVendorSource[];
  vendorOptions: VendorOption[];
  loadError: string | null;
};

export async function getItemSourcingData(
  supabase: Client,
  session: AppSession,
  itemId: string
): Promise<ItemSourcingData | null> {
  const canManage = canManageItems(
    session.profile.role,
    session.profile.active
  );

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, item_name, internal_sku")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    return {
      found: true,
      canManage,
      itemId,
      itemName: "",
      internalSku: "",
      sources: [],
      vendorOptions: [],
      loadError: itemError.message,
    };
  }

  if (!item) {
    return null;
  }

  const [sourcesResult, vendorsResult] = await Promise.all([
    supabase
      .from("item_vendors")
      .select(
        "id, vendor_id, is_preferred, vendor_sku, manufacturer, manufacturer_part_number, pack_size, typical_order_quantity, lead_time_days, typical_cost, last_order_date, ordering_notes, ordering_url, vendors(name)"
      )
      .eq("item_id", itemId),
    supabase
      .from("vendors")
      .select("id, name")
      .eq("active", true)
      .order("name"),
  ]);

  const sources: ItemVendorSource[] = (sourcesResult.data ?? []).map((row) => {
    const vendor = row.vendors as { name?: string } | null;
    return {
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: vendor?.name ?? "Unknown vendor",
      isPreferred: row.is_preferred,
      vendorSku: row.vendor_sku,
      manufacturer: row.manufacturer,
      manufacturerPartNumber: row.manufacturer_part_number,
      packSize: row.pack_size,
      typicalOrderQuantity:
        row.typical_order_quantity === null
          ? null
          : Number(row.typical_order_quantity),
      leadTimeDays: row.lead_time_days,
      typicalCost: row.typical_cost === null ? null : Number(row.typical_cost),
      lastOrderDate: row.last_order_date,
      orderingNotes: row.ordering_notes,
      orderingUrl: row.ordering_url,
    };
  });

  // Preferred first, then alphabetical by vendor name.
  sources.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    return a.vendorName.localeCompare(b.vendorName);
  });

  const loadError =
    sourcesResult.error?.message ?? vendorsResult.error?.message ?? null;

  return {
    found: true,
    canManage,
    itemId: item.id,
    itemName: item.item_name,
    internalSku: item.internal_sku,
    sources,
    vendorOptions: (vendorsResult.data ?? []).map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
    })),
    loadError,
  };
}
