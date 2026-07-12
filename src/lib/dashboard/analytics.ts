import type { Database } from "@/lib/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

/**
 * Normalized per-item shape shared by the dashboard analytics. Both
 * `items_stock_status` (all active items) and `items_below_reorder_point`
 * (attention subset) map into this so the pure functions below stay decoupled
 * from the raw view rows.
 */
export type DashboardItem = {
  itemId: string;
  itemName: string;
  internalSku: string | null;
  unitAbbreviation: string | null;
  totalOnHand: number;
  reorderPoint: number;
  parLevel: number;
  suggestedOrderQuantity: number;
};

export type StockHealthKey = "healthy" | "low" | "out";

export type StockHealthCounts = {
  healthy: number;
  low: number;
  out: number;
  total: number;
};

/**
 * Classify active items into stock-health buckets for the donut chart.
 *   out     — total on hand = 0
 *   low     — total on hand > 0 and <= reorder point
 *   healthy — total on hand > reorder point
 */
export function classifyStockHealth(items: DashboardItem[]): StockHealthCounts {
  const counts: StockHealthCounts = { healthy: 0, low: 0, out: 0, total: 0 };

  for (const item of items) {
    counts.total += 1;
    if (item.totalOnHand <= 0) {
      counts.out += 1;
    } else if (item.totalOnHand <= item.reorderPoint) {
      counts.low += 1;
    } else {
      counts.healthy += 1;
    }
  }

  return counts;
}

export type ReplenishmentItem = {
  itemId: string;
  itemName: string;
  unitAbbreviation: string | null;
  suggestedOrderQuantity: number;
};

/**
 * Top items by suggested order quantity (max(par_level - total_on_hand, 0)).
 * Only items that actually need reordering (quantity > 0) are returned, sorted
 * by quantity descending with an alphabetical tiebreak for stable output.
 */
export function getTopReplenishmentItems(
  items: DashboardItem[],
  limit = 5
): ReplenishmentItem[] {
  return items
    .filter((item) => item.suggestedOrderQuantity > 0)
    .sort((left, right) => {
      const byQuantity = right.suggestedOrderQuantity - left.suggestedOrderQuantity;
      if (byQuantity !== 0) return byQuantity;
      return left.itemName.localeCompare(right.itemName, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, limit)
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      unitAbbreviation: item.unitAbbreviation,
      suggestedOrderQuantity: item.suggestedOrderQuantity,
    }));
}

/**
 * Fraction of par level currently on hand (0 = empty). Used only to rank
 * urgency; par_level of 0 is treated as "fully stocked when anything on hand".
 */
function parRatio(item: DashboardItem): number {
  if (item.parLevel <= 0) {
    return item.totalOnHand > 0 ? 1 : 0;
  }
  return item.totalOnHand / item.parLevel;
}

/**
 * Items with zero reorder and par levels are treated as not yet configured
 * for replenishment alerts (avoids flooding the dashboard on fresh seed data).
 */
export function filterAttentionItems(items: DashboardItem[]): DashboardItem[] {
  return items.filter(
    (item) => item.reorderPoint > 0 || item.parLevel > 0
  );
}

/**
 * Sort attention items by urgency for the compact dashboard table:
 *   1. Out of stock first
 *   2. Lowest percentage of par
 *   3. Highest suggested order quantity
 * Alphabetical name is the final stable tiebreak. Returns at most `limit`.
 */
export function sortNeedsAttention(
  items: DashboardItem[],
  limit = 5
): DashboardItem[] {
  return [...items]
    .sort((left, right) => {
      const leftOut = left.totalOnHand <= 0 ? 0 : 1;
      const rightOut = right.totalOnHand <= 0 ? 0 : 1;
      if (leftOut !== rightOut) return leftOut - rightOut;

      const byRatio = parRatio(left) - parRatio(right);
      if (byRatio !== 0) return byRatio;

      const byQuantity =
        right.suggestedOrderQuantity - left.suggestedOrderQuantity;
      if (byQuantity !== 0) return byQuantity;

      return left.itemName.localeCompare(right.itemName, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, limit);
}

export type MovementTransaction = {
  occurredAt: string | null;
  transactionType: TransactionType | null;
  quantity: number | null;
};

export type MovementDay = {
  /** UTC calendar day, YYYY-MM-DD. */
  date: string;
  received: number;
  consumed: number;
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Aggregate RECEIVE and CONSUME transactions into a continuous daily series for
 * the movement-trend chart. The window always contains exactly `days` entries
 * ending on `endDate` (days with no activity are zero-filled) so the chart reads
 * cleanly even with sparse data. Transfers and count corrections are ignored.
 */
export function aggregateDailyMovement(
  transactions: MovementTransaction[],
  options: { endDate: Date; days?: number }
): MovementDay[] {
  const days = options.days ?? 30;
  const buckets = new Map<string, MovementDay>();

  const end = new Date(
    Date.UTC(
      options.endDate.getUTCFullYear(),
      options.endDate.getUTCMonth(),
      options.endDate.getUTCDate()
    )
  );

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = toDayKey(day);
    buckets.set(key, { date: key, received: 0, consumed: 0 });
  }

  for (const tx of transactions) {
    if (!tx.occurredAt || tx.quantity == null) continue;
    if (tx.transactionType !== "RECEIVE" && tx.transactionType !== "CONSUME") {
      continue;
    }

    const occurred = new Date(tx.occurredAt);
    if (Number.isNaN(occurred.getTime())) continue;

    const bucket = buckets.get(toDayKey(occurred));
    if (!bucket) continue;

    if (tx.transactionType === "RECEIVE") {
      bucket.received += tx.quantity;
    } else {
      bucket.consumed += tx.quantity;
    }
  }

  return [...buckets.values()];
}

/** Whether a movement series has any received or consumed activity at all. */
export function hasMovementActivity(series: MovementDay[]): boolean {
  return series.some((day) => day.received > 0 || day.consumed > 0);
}

// ---------------------------------------------------------------------------
// Expiration summary (dashboard card)
// ---------------------------------------------------------------------------

export type ExpirationLot = {
  lotId: string;
  itemName: string;
  locationName: string | null;
  quantityOnHand: number;
  unitAbbreviation: string | null;
  daysUntilExpiration: number | null;
};

export type TopExpiringLot = ExpirationLot & { daysUntilExpiration: number };

export type ExpirationSummary = {
  expired: number;
  expiring30: number;
  expiring90: number;
  topExpiring: TopExpiringLot[];
};

/**
 * Roll expiring/expired lots into the dashboard card: counts for expired, ≤30
 * and ≤90 days, plus the most urgent lots (expired or expiring within 90 days)
 * ranked by soonest expiry then largest quantity. Lots with no expiration date
 * are ignored. Counts are mutually exclusive by nearest bucket so the card
 * reads as an action list, not overlapping totals.
 */
export function summarizeExpirations(
  lots: ExpirationLot[],
  limit = 5
): ExpirationSummary {
  const summary: ExpirationSummary = {
    expired: 0,
    expiring30: 0,
    expiring90: 0,
    topExpiring: [],
  };

  const urgent: TopExpiringLot[] = [];

  for (const lot of lots) {
    const days = lot.daysUntilExpiration;
    if (days === null) continue;

    if (days < 0) {
      summary.expired += 1;
    } else if (days <= 30) {
      summary.expiring30 += 1;
    } else if (days <= 90) {
      summary.expiring90 += 1;
    }

    if (days <= 90) {
      urgent.push({ ...lot, daysUntilExpiration: days });
    }
  }

  summary.topExpiring = urgent
    .sort((left, right) => {
      const byDays = left.daysUntilExpiration - right.daysUntilExpiration;
      if (byDays !== 0) return byDays;
      const byQuantity = right.quantityOnHand - left.quantityOnHand;
      if (byQuantity !== 0) return byQuantity;
      return left.itemName.localeCompare(right.itemName, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, limit);

  return summary;
}

/** Whether the clinic has any expiring/expired lots worth surfacing. */
export function hasExpirationActivity(summary: ExpirationSummary): boolean {
  return (
    summary.expired > 0 || summary.expiring30 > 0 || summary.expiring90 > 0
  );
}
