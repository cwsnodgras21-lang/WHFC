import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildReorderSuggestions,
  itemLocationKey,
  type ItemLocationKey,
  type LotStockSnapshot,
  type ReorderItemMeta,
  type SuggestionActionSnapshot,
  USAGE_WINDOW_DAYS,
} from "@/lib/reorder-suggestions/calculate";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

function usageWindowStartIso(now: Date): string {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - (USAGE_WINDOW_DAYS - 1));
  return start.toISOString();
}

export async function fetchReorderSuggestionInputs(supabase: Client, now = new Date()) {
  const windowStart = usageWindowStartIso(now);

  const [
    itemsResult,
    locationsResult,
    onHandResult,
    lotsResult,
    consumeResult,
    actionsResult,
  ] = await Promise.all([
    supabase
      .from("items")
      .select(
        `
        id,
        item_name,
        internal_sku,
        reorder_point,
        par_level,
        track_expiration,
        preferred_vendor_id,
        vendors ( name ),
        units_of_measure ( abbreviation )
      `
      )
      .eq("active", true),
    supabase
      .from("locations")
      .select("id, location_name")
      .eq("active", true),
    supabase.from("inventory_on_hand").select("item_id, location_id, quantity_on_hand"),
    supabase
      .from("inventory_lot_stock")
      .select("item_id, location_id, quantity_on_hand, status, days_until_expiration")
      .gt("quantity_on_hand", 0),
    // Usage comes solely from the CONSUME ledger. Kit dispenses already write
    // CONSUME rows (see dispense_kit RPC), so this captures manual "use stock"
    // and kit dispensing without double-counting — and keeps reorder working
    // regardless of whether the procedure-kits/dispense module is enabled.
    supabase
      .from("inventory_transaction_history")
      .select("item_id, location_id, quantity, occurred_at, transaction_type")
      .eq("transaction_type", "CONSUME")
      .gte("occurred_at", windowStart),
    supabase
      .from("reorder_suggestion_actions")
      .select("item_id, location_id, action, dismissed_until, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const error =
    itemsResult.error ??
    locationsResult.error ??
    onHandResult.error ??
    lotsResult.error ??
    consumeResult.error ??
    actionsResult.error;

  if (error) {
    throw new Error(error.message);
  }

  const items: ReorderItemMeta[] = (itemsResult.data ?? []).map((item) => {
    const vendor = item.vendors as { name: string } | null;
    const unit = item.units_of_measure as { abbreviation: string } | null;
    return {
      itemId: item.id,
      itemName: item.item_name,
      internalSku: item.internal_sku,
      unitAbbreviation: unit?.abbreviation ?? "EA",
      reorderPoint: Number(item.reorder_point),
      parLevel: Number(item.par_level),
      preferredVendorId: item.preferred_vendor_id,
      vendorName: vendor?.name ?? null,
      trackExpiration: item.track_expiration,
    };
  });

  const onHandByItemLocation = new Map<ItemLocationKey, number>();
  for (const row of onHandResult.data ?? []) {
    if (!row.item_id || !row.location_id) continue;
    onHandByItemLocation.set(
      itemLocationKey(row.item_id, row.location_id),
      Number(row.quantity_on_hand)
    );
  }

  const lotsByItemLocation = new Map<ItemLocationKey, LotStockSnapshot[]>();
  for (const lot of lotsResult.data ?? []) {
    if (!lot.item_id || !lot.location_id) continue;
    const key = itemLocationKey(lot.item_id, lot.location_id);
    const list = lotsByItemLocation.get(key) ?? [];
    list.push({
      itemId: lot.item_id,
      locationId: lot.location_id,
      quantityOnHand: Number(lot.quantity_on_hand ?? 0),
      status: lot.status ?? "active",
      daysUntilExpiration:
        lot.days_until_expiration === null
          ? null
          : Number(lot.days_until_expiration),
    });
    lotsByItemLocation.set(key, list);
  }

  const usageByItemLocation = new Map<ItemLocationKey, number>();

  for (const tx of consumeResult.data ?? []) {
    if (!tx.item_id || !tx.location_id || tx.quantity == null) continue;
    const key = itemLocationKey(tx.item_id, tx.location_id);
    usageByItemLocation.set(
      key,
      (usageByItemLocation.get(key) ?? 0) + Number(tx.quantity)
    );
  }

  const latestActions = new Map<ItemLocationKey, SuggestionActionSnapshot>();
  for (const action of actionsResult.data ?? []) {
    const key = itemLocationKey(action.item_id, action.location_id);
    if (latestActions.has(key)) continue;
    latestActions.set(key, {
      itemId: action.item_id,
      locationId: action.location_id,
      action: action.action,
      dismissedUntil: action.dismissed_until,
      createdAt: action.created_at,
    });
  }

  return {
    items,
    locations: (locationsResult.data ?? []).map((l) => ({
      locationId: l.id,
      locationName: l.location_name,
    })),
    onHandByItemLocation,
    lotsByItemLocation,
    usageByItemLocation,
    latestActions,
    now,
  };
}

export async function computeReorderSuggestions(supabase: Client, now = new Date()) {
  const inputs = await fetchReorderSuggestionInputs(supabase, now);
  return buildReorderSuggestions(inputs);
}
