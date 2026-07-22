import type { SupabaseClient } from "@supabase/supabase-js";

import { canConsumeInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchOnHandByLocation, onHandKey } from "@/lib/data/inventory";
import { isModuleEnabled } from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import {
  CONSUME_REASON_CODES,
  getConsumeReasonLabel,
  type ConsumeReasonCode,
} from "@/lib/validation/consume-inventory";
import type { LotStatus } from "@/lib/lots/expiration";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ConsumeItemOption = {
  id: string;
  itemName: string;
  internalSku: string;
  unitName: string;
  unitAbbreviation: string;
  trackExpiration: boolean;
  trackLotNumber: boolean;
};

export type ConsumeLocationOption = {
  id: string;
  locationName: string;
};

export type ConsumeLotOption = {
  lotId: string;
  itemId: string;
  locationId: string;
  lotNumber: string | null;
  expirationDate: string | null;
  quantityOnHand: number;
  status: LotStatus;
  daysUntilExpiration: number | null;
};

export type RecentConsumption = {
  id: string;
  itemName: string;
  locationName: string;
  quantity: number;
  reasonLabel: string;
  transactionDate: string;
};

export type ConsumePageData = {
  canConsume: boolean;
  permissionMessage: string | null;
  items: ConsumeItemOption[];
  locations: ConsumeLocationOption[];
  lots: ConsumeLotOption[];
  onHandByKey: Record<string, number>;
  recentConsumptions: RecentConsumption[];
  lotTrackingEnabled: boolean;
  loadError: string | null;
};

function reasonLabel(code: string): string {
  if ((CONSUME_REASON_CODES as readonly string[]).includes(code)) {
    return getConsumeReasonLabel(code as ConsumeReasonCode);
  }
  return code;
}

export async function getConsumePageData(
  supabase: Client,
  session: AppSession
): Promise<ConsumePageData> {
  const canConsume = canConsumeInventory(
    session.profile.role,
    session.profile.active
  );

  if (!canConsume) {
    return {
      canConsume: false,
      permissionMessage:
        "Your account does not have permission to consume inventory. Contact an administrator if you need access.",
      items: [],
      locations: [],
      lots: [],
      onHandByKey: {},
      recentConsumptions: [],
      lotTrackingEnabled: true,
      loadError: null,
    };
  }

  const enabledModules = await getOrganizationModules();

  const [
    itemsResult,
    uomResult,
    locationsResult,
    lotsResult,
    onHandResult,
    consumptionsResult,
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
      .select("id, location_name")
      .eq("active", true)
      .order("location_name"),
    supabase
      .from("inventory_lot_stock")
      .select(
        "lot_id, item_id, location_id, lot_number, expiration_date, quantity_on_hand, status, days_until_expiration"
      )
      .gt("quantity_on_hand", 0)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
    fetchOnHandByLocation(supabase).catch(() => ({} as Record<string, number>)),
    supabase
      .from("inventory_transactions")
      .select("id, item_id, location_id, quantity, transaction_date, reason_code")
      .eq("transaction_type", "CONSUME")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const errors: string[] = [];
  if (itemsResult.error) errors.push(itemsResult.error.message);
  if (uomResult.error) errors.push(uomResult.error.message);
  if (locationsResult.error) errors.push(locationsResult.error.message);
  if (lotsResult.error) errors.push(lotsResult.error.message);
  if (consumptionsResult.error) errors.push(consumptionsResult.error.message);

  const uomMap = new Map((uomResult.data ?? []).map((u) => [u.id, u]));

  const items: ConsumeItemOption[] = (itemsResult.data ?? []).map((row) => {
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

  const lots: ConsumeLotOption[] = (lotsResult.data ?? []).flatMap((row) => {
    if (!row.lot_id || !row.item_id || !row.location_id) {
      return [];
    }
    return [
      {
        lotId: row.lot_id,
        itemId: row.item_id,
        locationId: row.location_id,
        lotNumber: row.lot_number,
        expirationDate: row.expiration_date,
        quantityOnHand: Number(row.quantity_on_hand ?? 0),
        status: row.status ?? "active",
        daysUntilExpiration:
          row.days_until_expiration === null
            ? null
            : Number(row.days_until_expiration),
      },
    ];
  });

  const locations: ConsumeLocationOption[] = (locationsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      locationName: row.location_name,
    })
  );

  const itemNameMap = new Map(items.map((i) => [i.id, i.itemName]));
  const locationNameMap = new Map(
    locations.map((l) => [l.id, l.locationName])
  );

  const recentConsumptions: RecentConsumption[] = (
    consumptionsResult.data ?? []
  ).map((row) => ({
    id: row.id,
    itemName: itemNameMap.get(row.item_id) ?? "Unknown item",
    locationName: locationNameMap.get(row.location_id) ?? "Unknown location",
    quantity: Number(row.quantity),
    reasonLabel: reasonLabel(row.reason_code),
    transactionDate: row.transaction_date,
  }));

  return {
    canConsume: true,
    permissionMessage: null,
    items,
    locations,
    lots,
    onHandByKey: onHandResult,
    recentConsumptions,
    lotTrackingEnabled: isModuleEnabled(enabledModules, "lot_tracking"),
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export { onHandKey };
