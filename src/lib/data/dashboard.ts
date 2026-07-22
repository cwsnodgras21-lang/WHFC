import {
  aggregateConsumptionByProcedure,
  countDispensesThisWeek,
  countDispensesToday,
  getTopProceduresThisMonth,
  hasDispenseAnalytics,
  projectItemRunway,
  type DispenseEventRecord,
  type DispenseLineRecord,
  type ItemRunwayProjection,
  type ProcedureConsumption,
  type ProcedureUsage,
} from "@/lib/dispense/analytics";
import {
  aggregateDailyMovement,
  classifyStockHealth,
  filterAttentionItems,
  getTopReplenishmentItems,
  hasExpirationActivity,
  hasMovementActivity,
  sortNeedsAttention,
  summarizeExpirations,
  type DashboardItem,
  type ExpirationLot,
  type ExpirationSummary,
  type MovementDay,
  type MovementTransaction,
  type ReplenishmentItem,
  type StockHealthCounts,
} from "@/lib/dashboard/analytics";
import type { ReorderSuggestion } from "@/lib/reorder-suggestions/calculate";
import { computeReorderSuggestions } from "@/lib/reorder-suggestions/fetch-inputs";
import {
  countPoDraftsAwaitingReview,
  fetchPoDraftsAwaitingReviewPreview,
  type PurchaseOrderDraftSummary,
} from "@/lib/data/purchase-order-drafts-page";
import { getGettingStartedProgress } from "@/lib/data/getting-started";
import type { GettingStartedProgress } from "@/lib/data/getting-started";
import { getOrganizationModules } from "@/lib/modules/fetch";
import { isModuleEnabled } from "@/lib/modules/definitions";
import type { OrganizationModules } from "@/lib/modules/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type RecentTransaction =
  Database["public"]["Views"]["recent_inventory_transactions"]["Row"];

type DashboardRecentTransaction = Pick<
  RecentTransaction,
  | "id"
  | "occurred_at"
  | "item_name"
  | "internal_sku"
  | "location_name"
  | "unit_abbreviation"
  | "transaction_type"
  | "quantity"
  | "reason_code"
>;

type StockStatusRow =
  Database["public"]["Views"]["items_stock_status"]["Row"];
type BelowReorderRow =
  Database["public"]["Views"]["items_below_reorder_point"]["Row"];

const RECENT_LIMIT = 5;
const MOVEMENT_DAYS = 30;
const DISPENSE_ANALYTICS_DAYS = 30;

export type DashboardSummary = {
  activeItems: number;
  activeLocations: number;
  belowReorderCount: number;
  recentActivityCount: number;
  stockHealth: StockHealthCounts;
  replenishment: ReplenishmentItem[];
  movement: MovementDay[];
  hasMovement: boolean;
  needsAttention: DashboardItem[];
  expiration: ExpirationSummary;
  hasExpiration: boolean;
  recentTransactions: DashboardRecentTransaction[];
  dispensesToday: number;
  dispensesThisWeek: number;
  topProceduresThisMonth: ProcedureUsage[];
  consumptionByProcedure: ProcedureConsumption[];
  itemRunway: ItemRunwayProjection[];
  hasDispenseAnalytics: boolean;
  reorderSuggestionCount: number;
  reorderSuggestions: ReorderSuggestion[];
  poDraftsAwaitingReviewCount: number;
  poDraftsAwaitingReview: PurchaseOrderDraftSummary[];
  openPhysicalCountCount: number;
  enabledModules: OrganizationModules;
  gettingStarted: GettingStartedProgress;
  errors: string[];
};

function toDashboardItem(row: StockStatusRow | BelowReorderRow): DashboardItem {
  return {
    itemId: row.item_id ?? "",
    itemName: row.item_name ?? "—",
    internalSku: row.internal_sku,
    unitAbbreviation: row.unit_abbreviation,
    totalOnHand: Number(row.total_on_hand ?? 0),
    reorderPoint: Number(row.reorder_point ?? 0),
    parLevel: Number(row.par_level ?? 0),
    suggestedOrderQuantity: Number(row.suggested_order_quantity ?? 0),
  };
}

/** Start of the trailing MOVEMENT_DAYS window at 00:00 UTC. */
function movementWindowStart(now: Date): Date {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - (MOVEMENT_DAYS - 1));
  return start;
}

function dispenseAnalyticsWindowStart(now: Date): Date {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - (DISPENSE_ANALYTICS_DAYS - 1));
  return start;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const enabledModules = await getOrganizationModules();
  const errors: string[] = [];

  const now = new Date();
  const windowStartIso = movementWindowStart(now).toISOString();
  const dispenseWindowStartIso = dispenseAnalyticsWindowStart(now).toISOString();
  const analyticsEnabled = isModuleEnabled(enabledModules, "analytics");
  const expirationEnabled = isModuleEnabled(enabledModules, "expiration_tracking");
  const reorderEnabled = isModuleEnabled(enabledModules, "reorder_suggestions");
  const poDraftsEnabled = isModuleEnabled(enabledModules, "po_drafts");

  const [
    locationsResult,
    stockStatusResult,
    belowReorderResult,
    movementResult,
    recentActivityResult,
    transactionsResult,
    lotsResult,
    dispenseEventsResult,
    reorderSuggestionsResult,
    poDraftsAwaitingReviewCount,
    poDraftsAwaitingReview,
    openCountsResult,
  ] = await Promise.all([
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("items_stock_status")
      .select(
        "item_id, item_name, internal_sku, unit_abbreviation, reorder_point, par_level, total_on_hand, suggested_order_quantity"
      ),
    supabase.from("items_below_reorder_point").select("*"),
    analyticsEnabled
      ? supabase
          .from("inventory_transaction_history")
          .select("transaction_type, quantity, occurred_at")
          .in("transaction_type", ["RECEIVE", "CONSUME"])
          .gte("occurred_at", windowStartIso)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("inventory_transaction_history")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", windowStartIso),
    supabase
      .from("recent_inventory_transactions")
      .select(
        "id, occurred_at, item_name, internal_sku, location_name, unit_abbreviation, transaction_type, quantity, reason_code"
      )
      .order("occurred_at", { ascending: false })
      .limit(RECENT_LIMIT),
    expirationEnabled
      ? supabase
          .from("inventory_lot_stock")
          .select(
            "lot_id, item_name, location_name, quantity_on_hand, unit_abbreviation, days_until_expiration"
          )
          .gt("quantity_on_hand", 0)
          .not("expiration_date", "is", null)
      : Promise.resolve({ data: [], error: null }),
    analyticsEnabled
      ? supabase
          .from("dispense_events")
          .select(
            `
        id,
        performed_at,
        procedure_kit_id,
        procedure_kits ( name ),
        dispense_event_lines (
          item_id,
          quantity_consumed,
          unit,
          items (
            item_name,
            units_of_measure ( abbreviation )
          )
        )
      `
          )
          .gte("performed_at", dispenseWindowStartIso)
      : Promise.resolve({ data: [], error: null }),
    reorderEnabled
      ? computeReorderSuggestions(supabase, now).catch(() => [])
      : Promise.resolve([]),
    poDraftsEnabled
      ? countPoDraftsAwaitingReview(supabase).catch(() => 0)
      : Promise.resolve(0),
    poDraftsEnabled
      ? fetchPoDraftsAwaitingReviewPreview(supabase, 5).catch(() => [])
      : Promise.resolve([] as PurchaseOrderDraftSummary[]),
    supabase
      .from("physical_counts")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
  ]);

  if (locationsResult.error) {
    errors.push(`Active locations: ${locationsResult.error.message}`);
  }
  if (stockStatusResult.error) {
    errors.push(`Stock status: ${stockStatusResult.error.message}`);
  }
  if (belowReorderResult.error) {
    errors.push(`Below reorder: ${belowReorderResult.error.message}`);
  }
  if (movementResult.error) {
    errors.push(`Inventory movement: ${movementResult.error.message}`);
  }
  if (recentActivityResult.error) {
    errors.push(`Recent activity: ${recentActivityResult.error.message}`);
  }
  if (transactionsResult.error) {
    errors.push(`Recent transactions: ${transactionsResult.error.message}`);
  }
  if (lotsResult.error) {
    errors.push(`Expiring lots: ${lotsResult.error.message}`);
  }
  if (dispenseEventsResult.error) {
    errors.push(`Dispense analytics: ${dispenseEventsResult.error.message}`);
  }
  if (openCountsResult.error) {
    errors.push(`Open counts: ${openCountsResult.error.message}`);
  }

  const stockItems = (stockStatusResult.data ?? []).map(toDashboardItem);
  const belowReorderItems = filterAttentionItems(
    (belowReorderResult.data ?? []).map(toDashboardItem)
  );
  const movementTransactions: MovementTransaction[] = (
    movementResult.data ?? []
  ).map((row) => ({
    occurredAt: row.occurred_at,
    transactionType: row.transaction_type,
    quantity: row.quantity,
  }));
  const movementSeries = aggregateDailyMovement(movementTransactions, {
    endDate: now,
    days: MOVEMENT_DAYS,
  });

  const expirationLots: ExpirationLot[] = (lotsResult.data ?? []).flatMap(
    (row) =>
      row.lot_id
        ? [
            {
              lotId: row.lot_id,
              itemName: row.item_name ?? "—",
              locationName: row.location_name,
              quantityOnHand: Number(row.quantity_on_hand ?? 0),
              unitAbbreviation: row.unit_abbreviation,
              daysUntilExpiration:
                row.days_until_expiration === null
                  ? null
                  : Number(row.days_until_expiration),
            },
          ]
        : []
  );
  const expiration = summarizeExpirations(expirationLots);

  const dispenseEvents: DispenseEventRecord[] = [];
  const dispenseLines: DispenseLineRecord[] = [];

  for (const event of dispenseEventsResult.data ?? []) {
    const kit = event.procedure_kits as { name: string } | null;
    const kitId = event.procedure_kit_id;
    const kitName = kit?.name ?? "Unknown kit";

    dispenseEvents.push({
      id: event.id,
      performedAt: event.performed_at,
      kitId,
      kitName,
    });

    for (const line of event.dispense_event_lines ?? []) {
      const item = line.items as {
        item_name: string;
        units_of_measure: { abbreviation: string } | null;
      } | null;

      dispenseLines.push({
        dispenseEventId: event.id,
        performedAt: event.performed_at,
        kitId,
        kitName,
        itemId: line.item_id,
        itemName: item?.item_name ?? "Unknown item",
        quantityConsumed: Number(line.quantity_consumed),
        unit: line.unit,
      });
    }
  }

  const onHandByItem = new Map<string, number>();
  const itemMeta = new Map<
    string,
    { itemName: string; unitAbbreviation: string | null }
  >();

  for (const item of stockItems) {
    onHandByItem.set(item.itemId, item.totalOnHand);
    itemMeta.set(item.itemId, {
      itemName: item.itemName,
      unitAbbreviation: item.unitAbbreviation,
    });
  }

  for (const line of dispenseLines) {
    if (!itemMeta.has(line.itemId)) {
      itemMeta.set(line.itemId, {
        itemName: line.itemName,
        unitAbbreviation: null,
      });
    }
  }

  const dispensesToday = countDispensesToday(dispenseEvents, now);
  const dispensesThisWeek = countDispensesThisWeek(dispenseEvents, now);
  const topProceduresThisMonth = getTopProceduresThisMonth(dispenseEvents, now);
  const consumptionByProcedure = aggregateConsumptionByProcedure(dispenseLines);
  const itemRunway = projectItemRunway(
    dispenseLines,
    onHandByItem,
    itemMeta,
    { endDate: now, days: DISPENSE_ANALYTICS_DAYS }
  );

  const gettingStarted = await getGettingStartedProgress(supabase, enabledModules);

  return {
    activeItems: stockItems.length,
    activeLocations: locationsResult.count ?? 0,
    belowReorderCount: belowReorderItems.length,
    recentActivityCount: recentActivityResult.count ?? 0,
    stockHealth: classifyStockHealth(stockItems),
    replenishment: getTopReplenishmentItems(stockItems),
    movement: movementSeries,
    hasMovement: hasMovementActivity(movementSeries),
    needsAttention: sortNeedsAttention(belowReorderItems),
    expiration,
    hasExpiration: hasExpirationActivity(expiration),
    recentTransactions: (transactionsResult.data ??
      []) as DashboardRecentTransaction[],
    dispensesToday,
    dispensesThisWeek,
    topProceduresThisMonth,
    consumptionByProcedure,
    itemRunway,
    hasDispenseAnalytics: hasDispenseAnalytics(
      dispensesToday,
      dispensesThisWeek,
      topProceduresThisMonth
    ),
    reorderSuggestionCount: reorderSuggestionsResult.length,
    reorderSuggestions: reorderSuggestionsResult.slice(0, 5),
    poDraftsAwaitingReviewCount,
    poDraftsAwaitingReview,
    openPhysicalCountCount: openCountsResult.count ?? 0,
    enabledModules,
    gettingStarted,
    errors,
  };
}
