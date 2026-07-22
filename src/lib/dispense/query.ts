import type { SupabaseClient } from "@supabase/supabase-js";

import { DISPENSE_HISTORY_PAGE_SIZE } from "@/lib/dispense/constants";
import {
  calculateTotalPages,
  escapeIlikePattern,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/transactions/query";
import type { Database, Json } from "@/lib/types/database";
import type { DispenseHistoryPageFilters } from "@/lib/validation/dispense-history-page";

type Client = SupabaseClient<Database>;

export type AdministeredAmountSnapshot = {
  componentId: string;
  amount: number;
  label: string | null;
  unit: string | null;
};

export type DispenseHistoryLine = {
  id: string;
  itemId: string;
  itemName: string;
  internalSku: string | null;
  quantityConsumed: number;
  unit: string;
  inventoryLotId: string | null;
  transactionId: string | null;
};

export type DispenseHistoryRow = {
  id: string;
  performedAt: string;
  source: Database["public"]["Enums"]["dispense_event_source"];
  transactionGroupId: string;
  allowExpiredConsumption: boolean;
  kitId: string;
  kitName: string;
  locationId: string;
  locationName: string;
  createdByName: string | null;
  administeredAmounts: AdministeredAmountSnapshot[];
  lines: DispenseHistoryLine[];
  itemsSummary: string;
};

export type DispenseHistoryQueryResult = {
  rows: DispenseHistoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DispenseHistoryWeekSummary = {
  eventCount: number;
  itemsConsumed: number;
  mostUsedKitName: string | null;
  mostUsedKitCount: number;
  expiredLotDispenses: number;
};

function parseAdministeredAmounts(value: Json | null): AdministeredAmountSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const row = entry as Record<string, Json | undefined>;
    const componentId = row.component_id;
    const amount = row.amount;
    if (typeof componentId !== "string" || typeof amount !== "number") {
      return [];
    }
    return [
      {
        componentId,
        amount,
        label: typeof row.label === "string" ? row.label : null,
        unit: typeof row.unit === "string" ? row.unit : null,
      },
    ];
  });
}

function formatAdministeredSummary(amounts: AdministeredAmountSnapshot[]): string {
  if (amounts.length === 0) {
    return "—";
  }
  return amounts
    .map((a) => {
      const label = a.label ?? "Amount";
      const unit = a.unit ? ` ${a.unit}` : "";
      return `${label}: ${a.amount}${unit}`;
    })
    .join("; ");
}

function formatItemsSummary(lines: DispenseHistoryLine[]): string {
  if (lines.length === 0) {
    return "—";
  }
  return lines
    .map((line) => `${line.itemName} (${line.quantityConsumed} ${line.unit})`)
    .join(", ");
}

type RawDispenseRow = {
  id: string;
  performed_at: string;
  source: Database["public"]["Enums"]["dispense_event_source"];
  transaction_group_id: string;
  allow_expired_consumption: boolean;
  administered_amounts: Json;
  procedure_kits: { id: string; name: string } | null;
  locations: {
    id: string;
    location_name: string;
  } | null;
  profiles: { full_name: string | null } | null;
  dispense_event_lines: Array<{
    id: string;
    item_id: string;
    quantity_consumed: number;
    unit: string;
    inventory_lot_id: string | null;
    transaction_id: string | null;
    items: { item_name: string; internal_sku: string } | null;
  }>;
};

function mapDispenseRow(row: RawDispenseRow): DispenseHistoryRow {
  const lines: DispenseHistoryLine[] = (row.dispense_event_lines ?? []).map(
    (line) => ({
      id: line.id,
      itemId: line.item_id,
      itemName: line.items?.item_name ?? "Unknown item",
      internalSku: line.items?.internal_sku ?? null,
      quantityConsumed: Number(line.quantity_consumed),
      unit: line.unit,
      inventoryLotId: line.inventory_lot_id,
      transactionId: line.transaction_id,
    })
  );

  const administeredAmounts = parseAdministeredAmounts(row.administered_amounts);

  return {
    id: row.id,
    performedAt: row.performed_at,
    source: row.source,
    transactionGroupId: row.transaction_group_id,
    allowExpiredConsumption: row.allow_expired_consumption,
    kitId: row.procedure_kits?.id ?? "",
    kitName: row.procedure_kits?.name ?? "Unknown kit",
    locationId: row.locations?.id ?? "",
    locationName: row.locations?.location_name ?? "—",
    createdByName: row.profiles?.full_name ?? null,
    administeredAmounts,
    lines,
    itemsSummary: formatItemsSummary(lines),
  };
}

function applyDispenseHistoryFilters<
  T extends {
    eq: (column: string, value: string) => T;
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
    in: (column: string, values: string[]) => T;
  },
>(query: T, filters: DispenseHistoryPageFilters, kitIdsForSearch?: string[]): T {
  let filtered = query;

  if (filters.procedureKitId) {
    filtered = filtered.eq("procedure_kit_id", filters.procedureKitId);
  }
  if (filters.locationId) {
    filtered = filtered.eq("location_id", filters.locationId);
  }
  if (filters.source) {
    filtered = filtered.eq("source", filters.source);
  }
  if (kitIdsForSearch && kitIdsForSearch.length > 0) {
    filtered = filtered.in("procedure_kit_id", kitIdsForSearch);
  }

  const dateFrom = filters.dateFrom ? toStartOfDayIso(filters.dateFrom) : null;
  if (dateFrom) {
    filtered = filtered.gte("performed_at", dateFrom);
  }

  const dateTo = filters.dateTo ? toEndOfDayIso(filters.dateTo) : null;
  if (dateTo) {
    filtered = filtered.lte("performed_at", dateTo);
  }

  return filtered;
}

export async function fetchDispenseHistory(
  supabase: Client,
  filters: DispenseHistoryPageFilters,
  pageSize: number = DISPENSE_HISTORY_PAGE_SIZE
): Promise<DispenseHistoryQueryResult> {
  const page = filters.page;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let kitIdsForSearch: string[] | undefined;
  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${escapeIlikePattern(search)}%`;
    const { data: kits, error: kitError } = await supabase
      .from("procedure_kits")
      .select("id")
      .ilike("name", pattern);

    if (kitError) {
      throw new Error(kitError.message);
    }

    kitIdsForSearch = (kits ?? []).map((kit) => kit.id);
    if (kitIdsForSearch.length === 0) {
      return {
        rows: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }
  }

  let query = supabase
    .from("dispense_events")
    .select(
      `
      id,
      performed_at,
      source,
      transaction_group_id,
      allow_expired_consumption,
      administered_amounts,
      procedure_kits!inner ( id, name ),
      locations!inner ( id, location_name ),
      profiles!dispense_events_created_by_fkey ( full_name ),
      dispense_event_lines (
        id,
        item_id,
        quantity_consumed,
        unit,
        inventory_lot_id,
        transaction_id,
        items ( item_name, internal_sku )
      )
    `,
      { count: "exact" }
    )
    .order("performed_at", { ascending: false });

  query = applyDispenseHistoryFilters(query, filters, kitIdsForSearch);

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  const rows = ((data ?? []) as RawDispenseRow[]).map(mapDispenseRow);

  return {
    rows,
    totalCount,
    page,
    pageSize,
    totalPages: calculateTotalPages(totalCount, pageSize),
  };
}

export function weekStartIso(now: Date): string {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - diff);
  return start.toISOString();
}

export async function fetchDispenseWeekSummary(
  supabase: Client
): Promise<DispenseHistoryWeekSummary> {
  const weekStart = weekStartIso(new Date());

  const { data, error } = await supabase
    .from("dispense_events")
    .select(
      `
      id,
      allow_expired_consumption,
      procedure_kits ( name ),
      dispense_event_lines ( quantity_consumed )
    `
    )
    .gte("performed_at", weekStart);

  if (error) {
    throw new Error(error.message);
  }

  const events = data ?? [];
  const kitCounts = new Map<string, number>();
  let itemsConsumed = 0;
  let expiredLotDispenses = 0;

  for (const event of events) {
    const kit = event.procedure_kits as { name: string } | null;
    const kitName = kit?.name ?? "Unknown";
    kitCounts.set(kitName, (kitCounts.get(kitName) ?? 0) + 1);

    if (event.allow_expired_consumption) {
      expiredLotDispenses += 1;
    }

    for (const line of event.dispense_event_lines ?? []) {
      itemsConsumed += Number(line.quantity_consumed ?? 0);
    }
  }

  let mostUsedKitName: string | null = null;
  let mostUsedKitCount = 0;
  for (const [name, count] of kitCounts) {
    if (count > mostUsedKitCount) {
      mostUsedKitName = name;
      mostUsedKitCount = count;
    }
  }

  return {
    eventCount: events.length,
    itemsConsumed,
    mostUsedKitName,
    mostUsedKitCount,
    expiredLotDispenses,
  };
}

export async function fetchLedgerForDispenseGroup(
  supabase: Client,
  transactionGroupId: string
) {
  const { data, error } = await supabase
    .from("inventory_transaction_history")
    .select("*")
    .eq("transaction_group_id", transactionGroupId)
    .order("occurred_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export { formatAdministeredSummary };
