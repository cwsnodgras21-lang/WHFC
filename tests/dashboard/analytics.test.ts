import { describe, expect, it } from "vitest";

import {
  aggregateDailyMovement,
  classifyStockHealth,
  filterAttentionItems,
  getTopReplenishmentItems,
  hasMovementActivity,
  sortNeedsAttention,
  type DashboardItem,
  type MovementTransaction,
} from "@/lib/dashboard/analytics";

function item(overrides: Partial<DashboardItem> = {}): DashboardItem {
  return {
    itemId: overrides.itemId ?? "id",
    itemName: overrides.itemName ?? "Item",
    internalSku: overrides.internalSku ?? null,
    unitAbbreviation: overrides.unitAbbreviation ?? "box",
    totalOnHand: overrides.totalOnHand ?? 0,
    reorderPoint: overrides.reorderPoint ?? 0,
    parLevel: overrides.parLevel ?? 0,
    suggestedOrderQuantity: overrides.suggestedOrderQuantity ?? 0,
  };
}

describe("classifyStockHealth", () => {
  it("buckets items by the donut rules", () => {
    const counts = classifyStockHealth([
      item({ totalOnHand: 0, reorderPoint: 5 }), // out
      item({ totalOnHand: -3, reorderPoint: 5 }), // out (negative guarded)
      item({ totalOnHand: 5, reorderPoint: 5 }), // low (== reorder counts as low)
      item({ totalOnHand: 2, reorderPoint: 5 }), // low
      item({ totalOnHand: 6, reorderPoint: 5 }), // healthy
    ]);

    expect(counts).toEqual({ healthy: 1, low: 2, out: 2, total: 5 });
  });

  it("returns an all-zero empty state for no items", () => {
    expect(classifyStockHealth([])).toEqual({
      healthy: 0,
      low: 0,
      out: 0,
      total: 0,
    });
  });
});

describe("getTopReplenishmentItems", () => {
  it("returns only items needing reorder, highest quantity first", () => {
    const result = getTopReplenishmentItems([
      item({ itemName: "A", suggestedOrderQuantity: 0 }),
      item({ itemName: "B", suggestedOrderQuantity: 12 }),
      item({ itemName: "C", suggestedOrderQuantity: 30 }),
    ]);

    expect(result.map((r) => r.itemName)).toEqual(["C", "B"]);
  });

  it("breaks quantity ties alphabetically", () => {
    const result = getTopReplenishmentItems([
      item({ itemName: "Zeta", suggestedOrderQuantity: 10 }),
      item({ itemName: "Alpha", suggestedOrderQuantity: 10 }),
    ]);

    expect(result.map((r) => r.itemName)).toEqual(["Alpha", "Zeta"]);
  });

  it("limits to five items", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      item({ itemName: `Item ${i}`, suggestedOrderQuantity: i + 1 })
    );

    expect(getTopReplenishmentItems(items)).toHaveLength(5);
  });

  it("returns an empty list when nothing needs reorder", () => {
    expect(
      getTopReplenishmentItems([item({ suggestedOrderQuantity: 0 })])
    ).toEqual([]);
  });
});

describe("filterAttentionItems", () => {
  it("excludes items with zero reorder and par levels", () => {
    const filtered = filterAttentionItems([
      item({ itemName: "Configured", reorderPoint: 5, parLevel: 10 }),
      item({ itemName: "Unset", reorderPoint: 0, parLevel: 0 }),
      item({ itemName: "Reorder only", reorderPoint: 3, parLevel: 0 }),
    ]);

    expect(filtered.map((row) => row.itemName)).toEqual([
      "Configured",
      "Reorder only",
    ]);
  });
});

describe("sortNeedsAttention", () => {
  it("orders out-of-stock first, then lowest percentage of par, then quantity", () => {
    const rows = [
      item({
        itemName: "Low 40%",
        totalOnHand: 4,
        parLevel: 10,
        reorderPoint: 6,
        suggestedOrderQuantity: 6,
      }),
      item({
        itemName: "Out",
        totalOnHand: 0,
        parLevel: 10,
        reorderPoint: 6,
        suggestedOrderQuantity: 10,
      }),
      item({
        itemName: "Low 20%",
        totalOnHand: 2,
        parLevel: 10,
        reorderPoint: 6,
        suggestedOrderQuantity: 8,
      }),
    ];

    expect(sortNeedsAttention(rows).map((r) => r.itemName)).toEqual([
      "Out",
      "Low 20%",
      "Low 40%",
    ]);
  });

  it("uses suggested order quantity to break equal par ratios", () => {
    const rows = [
      item({
        itemName: "Small",
        totalOnHand: 5,
        parLevel: 10,
        suggestedOrderQuantity: 5,
      }),
      item({
        itemName: "Big",
        totalOnHand: 50,
        parLevel: 100,
        suggestedOrderQuantity: 50,
      }),
    ];

    expect(sortNeedsAttention(rows).map((r) => r.itemName)).toEqual([
      "Big",
      "Small",
    ]);
  });

  it("limits to five rows", () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      item({ itemName: `Item ${i}`, totalOnHand: i, parLevel: 10 })
    );

    expect(sortNeedsAttention(rows)).toHaveLength(5);
  });
});

describe("aggregateDailyMovement", () => {
  const endDate = new Date("2026-07-05T12:00:00Z");

  it("produces a continuous zero-filled 30-day window", () => {
    const series = aggregateDailyMovement([], { endDate, days: 30 });

    expect(series).toHaveLength(30);
    expect(series[0]?.date).toBe("2026-06-06");
    expect(series[29]?.date).toBe("2026-07-05");
    expect(hasMovementActivity(series)).toBe(false);
  });

  it("splits RECEIVE and CONSUME per day and ignores other types", () => {
    const transactions: MovementTransaction[] = [
      { occurredAt: "2026-07-05T09:00:00Z", transactionType: "RECEIVE", quantity: 10 },
      { occurredAt: "2026-07-05T15:00:00Z", transactionType: "RECEIVE", quantity: 5 },
      { occurredAt: "2026-07-05T16:00:00Z", transactionType: "CONSUME", quantity: 3 },
      { occurredAt: "2026-07-04T10:00:00Z", transactionType: "CONSUME", quantity: 7 },
      // excluded types
      { occurredAt: "2026-07-05T10:00:00Z", transactionType: "TRANSFER_IN", quantity: 100 },
      { occurredAt: "2026-07-05T10:00:00Z", transactionType: "TRANSFER_OUT", quantity: 100 },
      { occurredAt: "2026-07-05T10:00:00Z", transactionType: "PHYSICAL_COUNT_CORRECTION", quantity: 100 },
      { occurredAt: "2026-07-05T10:00:00Z", transactionType: "ADJUSTMENT_INCREASE", quantity: 100 },
    ];

    const series = aggregateDailyMovement(transactions, { endDate, days: 30 });
    const byDate = new Map(series.map((day) => [day.date, day]));

    expect(byDate.get("2026-07-05")).toEqual({
      date: "2026-07-05",
      received: 15,
      consumed: 3,
    });
    expect(byDate.get("2026-07-04")).toEqual({
      date: "2026-07-04",
      received: 0,
      consumed: 7,
    });
    expect(hasMovementActivity(series)).toBe(true);
  });

  it("ignores transactions outside the window and malformed rows", () => {
    const transactions: MovementTransaction[] = [
      { occurredAt: "2026-05-01T10:00:00Z", transactionType: "RECEIVE", quantity: 99 },
      { occurredAt: null, transactionType: "RECEIVE", quantity: 5 },
      { occurredAt: "2026-07-05T10:00:00Z", transactionType: "RECEIVE", quantity: null },
    ];

    const series = aggregateDailyMovement(transactions, { endDate, days: 30 });

    expect(hasMovementActivity(series)).toBe(false);
  });
});
