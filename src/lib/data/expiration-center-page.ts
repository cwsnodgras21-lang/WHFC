import type { SupabaseClient } from "@supabase/supabase-js";

import { canConsumeInventory, canManageItems, canTransferInventory } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  expirationBucketMatches,
  type LotStatus,
} from "@/lib/lots/expiration";
import type { ExpirationCenterPageFilters } from "@/lib/validation/expiration-center-page";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ExpirationLotRow = {
  lotId: string;
  itemId: string;
  itemName: string;
  internalSku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  locationId: string;
  locationName: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  quantityOnHand: number;
  unitAbbreviation: string | null;
  status: LotStatus;
  daysUntilExpiration: number | null;
  /** Earliest-expiring open lot for its item (FEFO) — pull this one first. */
  useFirst: boolean;
};

export type ExpirationSummary = {
  expired: number;
  expiring7: number;
  expiring30: number;
  expiring60: number;
  expiring90: number;
  totalDated: number;
};

export type FilterOption = { id: string; name: string };

export type ExpirationCenterData = {
  canView: boolean;
  permissionMessage: string | null;
  rows: ExpirationLotRow[];
  summary: ExpirationSummary;
  filters: ExpirationCenterPageFilters;
  categories: FilterOption[];
  items: FilterOption[];
  locations: FilterOption[];
  canDispose: boolean;
  canAdjust: boolean;
  canTransfer: boolean;
  loadError: string | null;
};

const EMPTY_SUMMARY: ExpirationSummary = {
  expired: 0,
  expiring7: 0,
  expiring30: 0,
  expiring60: 0,
  expiring90: 0,
  totalDated: 0,
};

export async function getExpirationCenterData(
  supabase: Client,
  session: AppSession,
  filters: ExpirationCenterPageFilters
): Promise<ExpirationCenterData> {
  if (!session.profile.active) {
    return {
      canView: false,
      permissionMessage: "Your account cannot view the expiration center.",
      rows: [],
      summary: EMPTY_SUMMARY,
      filters,
      categories: [],
      items: [],
      locations: [],
      canDispose: false,
      canAdjust: false,
      canTransfer: false,
      loadError: null,
    };
  }

  let lotQuery = supabase
    .from("inventory_lot_stock")
    .select(
      "lot_id, item_id, item_name, internal_sku, category_id, category_name, location_id, location_name, lot_number, expiration_date, quantity_on_hand, unit_abbreviation, status, days_until_expiration"
    )
    .gt("quantity_on_hand", 0)
    .not("expiration_date", "is", null);

  if (filters.categoryId) {
    lotQuery = lotQuery.eq("category_id", filters.categoryId);
  }
  if (filters.itemId) {
    lotQuery = lotQuery.eq("item_id", filters.itemId);
  }
  if (filters.locationId) {
    lotQuery = lotQuery.eq("location_id", filters.locationId);
  }

  const [lotResult, categoriesResult, itemsResult, locationsResult] =
    await Promise.all([
      lotQuery.order("expiration_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("items")
        .select("id, item_name")
        .eq("active", true)
        .eq("track_expiration", true)
        .order("item_name"),
      supabase
        .from("locations")
        .select("id, location_name")
        .eq("active", true)
        .order("location_name"),
    ]);

  const errors: string[] = [];
  if (lotResult.error) errors.push(lotResult.error.message);
  if (categoriesResult.error) errors.push(categoriesResult.error.message);
  if (itemsResult.error) errors.push(itemsResult.error.message);
  if (locationsResult.error) errors.push(locationsResult.error.message);

  const allDated: ExpirationLotRow[] = (lotResult.data ?? []).flatMap((row) => {
    if (!row.lot_id || !row.item_id || !row.location_id) {
      return [];
    }
    return [
      {
        lotId: row.lot_id,
        itemId: row.item_id,
        itemName: row.item_name ?? "—",
        internalSku: row.internal_sku,
        categoryId: row.category_id,
        categoryName: row.category_name,
        locationId: row.location_id,
        locationName: row.location_name,
        lotNumber: row.lot_number,
        expirationDate: row.expiration_date,
        quantityOnHand: Number(row.quantity_on_hand ?? 0),
        unitAbbreviation: row.unit_abbreviation,
        status: row.status ?? "active",
        daysUntilExpiration:
          row.days_until_expiration === null
            ? null
            : Number(row.days_until_expiration),
        useFirst: false,
      },
    ];
  });

  markUseFirst(allDated);

  const summary = summarize(allDated);
  const rows = allDated.filter((row) =>
    expirationBucketMatches(row.daysUntilExpiration, filters.bucket)
  );

  return {
    canView: true,
    permissionMessage: null,
    rows,
    summary,
    filters,
    categories: (categoriesResult.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    })),
    items: (itemsResult.data ?? []).map((i) => ({
      id: i.id,
      name: i.item_name,
    })),
    locations: (locationsResult.data ?? []).map((l) => ({
      id: l.id,
      name: l.location_name,
    })),
    canDispose: canConsumeInventory(session.profile.role, session.profile.active),
    canAdjust: canManageItems(session.profile.role, session.profile.active),
    canTransfer: canTransferInventory(session.profile.role, session.profile.active),
    loadError: errors.length > 0 ? errors.join(" ") : null,
  };
}

function summarize(rows: ExpirationLotRow[]): ExpirationSummary {
  const summary: ExpirationSummary = { ...EMPTY_SUMMARY };
  for (const row of rows) {
    summary.totalDated += 1;
    const days = row.daysUntilExpiration;
    if (days === null) continue;
    if (days < 0) {
      summary.expired += 1;
    } else if (days <= 7) {
      summary.expiring7 += 1;
    } else if (days <= 30) {
      summary.expiring30 += 1;
    } else if (days <= 60) {
      summary.expiring60 += 1;
    } else if (days <= 90) {
      summary.expiring90 += 1;
    }
  }
  return summary;
}

/**
 * Flags the earliest-expiring on-hand lot of each item as "use first" (FEFO),
 * so staff know which specific lot to pull before it becomes waste. Ties on the
 * same soonest date are all flagged.
 */
function markUseFirst(rows: ExpirationLotRow[]): void {
  const earliestByItem = new Map<string, number>();
  for (const row of rows) {
    if (row.daysUntilExpiration === null) continue;
    const current = earliestByItem.get(row.itemId);
    if (current === undefined || row.daysUntilExpiration < current) {
      earliestByItem.set(row.itemId, row.daysUntilExpiration);
    }
  }
  for (const row of rows) {
    if (
      row.daysUntilExpiration !== null &&
      earliestByItem.get(row.itemId) === row.daysUntilExpiration
    ) {
      row.useFirst = true;
    }
  }
}
