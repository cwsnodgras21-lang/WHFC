import type { SupabaseClient } from "@supabase/supabase-js";

import { canReceiveInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchOnHandByLocation, onHandKey } from "@/lib/data/inventory";
import { isModuleEnabled } from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import {
  getReceiveReasonLabel,
  RECEIVE_REASON_CODES,
  type ReceiveReasonCode,
} from "@/lib/validation/receive-inventory";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ReceiveItemOption = {
  id: string;
  itemName: string;
  internalSku: string;
  unitName: string;
  unitAbbreviation: string;
  trackExpiration: boolean;
  trackLotNumber: boolean;
};

export type ReceiveLocationOption = {
  id: string;
  locationName: string;
  room: string | null;
};

export type ReceiveVendorOption = {
  id: string;
  name: string;
};

export type RecentReceipt = {
  id: string;
  itemName: string;
  locationName: string;
  quantity: number;
  reasonLabel: string;
  transactionDate: string;
};

export type ReceivePageData = {
  canReceive: boolean;
  permissionMessage: string | null;
  items: ReceiveItemOption[];
  locations: ReceiveLocationOption[];
  vendors: ReceiveVendorOption[];
  onHandByKey: Record<string, number>;
  recentReceipts: RecentReceipt[];
  expirationTrackingEnabled: boolean;
  lotTrackingEnabled: boolean;
  loadError: string | null;
};

function reasonLabel(code: string): string {
  if ((RECEIVE_REASON_CODES as readonly string[]).includes(code)) {
    return getReceiveReasonLabel(code as ReceiveReasonCode);
  }
  return code;
}

export async function getReceivePageData(
  supabase: Client,
  session: AppSession
): Promise<ReceivePageData> {
  const canReceive = canReceiveInventory(
    session.profile.role,
    session.profile.active
  );

  if (!canReceive) {
    return {
      canReceive: false,
      permissionMessage:
        "Your account does not have permission to receive inventory. Contact an administrator if you need access.",
      items: [],
      locations: [],
      vendors: [],
      onHandByKey: {},
      recentReceipts: [],
      expirationTrackingEnabled: true,
      lotTrackingEnabled: true,
      loadError: null,
    };
  }

  const enabledModules = await getOrganizationModules();

  const [
    itemsResult,
    uomResult,
    locationsResult,
    vendorsResult,
    onHandResult,
    receiptsResult,
  ] = await Promise.all([
    supabase
      .from("items")
      .select(
        "id, item_name, internal_sku, unit_of_measure_id, track_expiration, track_lot_number"
      )
      .eq("active", true)
      .order("item_name"),
    supabase
      .from("units_of_measure")
      .select("id, name, abbreviation")
      .eq("active", true),
    supabase
      .from("locations")
      .select("id, location_name, room")
      .eq("active", true)
      .order("location_name"),
    supabase
      .from("vendors")
      .select("id, name")
      .eq("active", true)
      .order("name"),
    fetchOnHandByLocation(supabase).catch(() => ({} as Record<string, number>)),
    supabase
      .from("inventory_transactions")
      .select("id, item_id, location_id, quantity, transaction_date, reason_code")
      .eq("transaction_type", "RECEIVE")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const errors: string[] = [];
  if (itemsResult.error) errors.push(itemsResult.error.message);
  if (uomResult.error) errors.push(uomResult.error.message);
  if (locationsResult.error) errors.push(locationsResult.error.message);
  if (vendorsResult.error) errors.push(vendorsResult.error.message);
  if (receiptsResult.error) errors.push(receiptsResult.error.message);

  const uomMap = new Map(
    (uomResult.data ?? []).map((u) => [u.id, u])
  );

  const items: ReceiveItemOption[] = (itemsResult.data ?? []).map((row) => {
    const unit = uomMap.get(row.unit_of_measure_id);
    return {
      id: row.id,
      itemName: row.item_name,
      internalSku: row.internal_sku,
      unitName: unit?.name ?? "Unit",
      unitAbbreviation: unit?.abbreviation ?? "—",
      trackExpiration: row.track_expiration,
      trackLotNumber: row.track_lot_number,
    };
  });

  const locations: ReceiveLocationOption[] = (locationsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      locationName: row.location_name,
      room: row.room,
    })
  );

  const vendors: ReceiveVendorOption[] = (vendorsResult.data ?? []).map(
    (row) => ({ id: row.id, name: row.name })
  );

  const itemNameMap = new Map(items.map((i) => [i.id, i.itemName]));
  const locationNameMap = new Map(
    locations.map((l) => [l.id, l.locationName])
  );

  const recentReceipts: RecentReceipt[] = (receiptsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      itemName: itemNameMap.get(row.item_id) ?? "Unknown item",
      locationName: locationNameMap.get(row.location_id) ?? "Unknown location",
      quantity: Number(row.quantity),
      reasonLabel: reasonLabel(row.reason_code),
      transactionDate: row.transaction_date,
    })
  );

  return {
    canReceive: true,
    permissionMessage: null,
    items,
    locations,
    vendors,
    onHandByKey: onHandResult,
    recentReceipts,
    expirationTrackingEnabled: isModuleEnabled(
      enabledModules,
      "expiration_tracking"
    ),
    lotTrackingEnabled: isModuleEnabled(enabledModules, "lot_tracking"),
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export { onHandKey };
