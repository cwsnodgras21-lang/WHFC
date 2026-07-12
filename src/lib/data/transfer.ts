import type { SupabaseClient } from "@supabase/supabase-js";

import { canTransferInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { fetchOnHandByLocation, onHandKey } from "@/lib/data/inventory";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type TransferItemOption = {
  id: string;
  itemName: string;
  internalSku: string;
  unitName: string;
  unitAbbreviation: string;
};

export type TransferLocationOption = {
  id: string;
  locationName: string;
  room: string | null;
};

export type RecentTransfer = {
  id: string;
  itemName: string;
  fromLocationName: string;
  toLocationName: string;
  quantity: number;
  transactionDate: string;
};

export type TransferPageData = {
  canTransfer: boolean;
  permissionMessage: string | null;
  items: TransferItemOption[];
  locations: TransferLocationOption[];
  onHandByKey: Record<string, number>;
  recentTransfers: RecentTransfer[];
  loadError: string | null;
};

export async function getTransferPageData(
  supabase: Client,
  session: AppSession
): Promise<TransferPageData> {
  const canTransfer = canTransferInventory(
    session.profile.role,
    session.profile.active
  );

  if (!canTransfer) {
    return {
      canTransfer: false,
      permissionMessage:
        "Your account does not have permission to transfer inventory. Only administrators and inventory managers can move stock between locations.",
      items: [],
      locations: [],
      onHandByKey: {},
      recentTransfers: [],
      loadError: null,
    };
  }

  const [itemsResult, uomResult, locationsResult, onHandResult, transfersResult] =
    await Promise.all([
      supabase
        .from("items")
        .select("id, item_name, internal_sku, unit_of_measure_id")
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
      fetchOnHandByLocation(supabase).catch(() => ({} as Record<string, number>)),
      supabase
        .from("inventory_transactions")
        .select(
          "id, item_id, location_id, quantity, transaction_date, transaction_group_id"
        )
        .eq("transaction_type", "TRANSFER_OUT")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const errors: string[] = [];
  if (itemsResult.error) errors.push(itemsResult.error.message);
  if (uomResult.error) errors.push(uomResult.error.message);
  if (locationsResult.error) errors.push(locationsResult.error.message);
  if (transfersResult.error) errors.push(transfersResult.error.message);

  const uomMap = new Map((uomResult.data ?? []).map((u) => [u.id, u]));

  const items: TransferItemOption[] = (itemsResult.data ?? []).map((row) => {
    const unit = uomMap.get(row.unit_of_measure_id);
    return {
      id: row.id,
      itemName: row.item_name,
      internalSku: row.internal_sku,
      unitName: unit?.name ?? "Unit",
      unitAbbreviation: unit?.abbreviation ?? "—",
    };
  });

  const locations: TransferLocationOption[] = (locationsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      locationName: row.location_name,
      room: row.room,
    })
  );

  const itemNameMap = new Map(items.map((i) => [i.id, i.itemName]));
  const locationNameMap = new Map(
    locations.map((l) => [l.id, l.locationName])
  );

  const transferOutRows = transfersResult.data ?? [];
  const groupIds = [
    ...new Set(
      transferOutRows
        .map((row) => row.transaction_group_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let destinationByGroup = new Map<string, string>();

  if (groupIds.length > 0) {
    const transferInsResult = await supabase
      .from("inventory_transactions")
      .select("transaction_group_id, location_id")
      .eq("transaction_type", "TRANSFER_IN")
      .in("transaction_group_id", groupIds);

    if (transferInsResult.error) {
      errors.push(transferInsResult.error.message);
    } else {
      destinationByGroup = new Map(
        (transferInsResult.data ?? []).map((row) => [
          row.transaction_group_id,
          row.location_id,
        ])
      );
    }
  }

  const recentTransfers: RecentTransfer[] = transferOutRows.map((row) => {
    const toLocationId = row.transaction_group_id
      ? destinationByGroup.get(row.transaction_group_id)
      : undefined;

    return {
      id: row.id,
      itemName: itemNameMap.get(row.item_id) ?? "Unknown item",
      fromLocationName:
        locationNameMap.get(row.location_id) ?? "Unknown location",
      toLocationName: toLocationId
        ? (locationNameMap.get(toLocationId) ?? "Unknown location")
        : "Unknown location",
      quantity: Number(row.quantity),
      transactionDate: row.transaction_date,
    };
  });

  return {
    canTransfer: true,
    permissionMessage: null,
    items,
    locations,
    onHandByKey: onHandResult,
    recentTransfers,
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export { onHandKey };
