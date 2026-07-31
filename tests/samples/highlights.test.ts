import { describe, expect, it } from "vitest";

import { computeSamplesHighlights, type SampleStockRow } from "@/lib/data/samples";

function makeRow(overrides: Partial<SampleStockRow> = {}): SampleStockRow {
  return {
    sampleProductId: "p1",
    productName: "Sample product",
    manufacturerVendor: null,
    strength: null,
    dosageForm: null,
    unitAbbreviation: "EA",
    reorderThreshold: 5,
    expirationWarningDays: null,
    active: true,
    notes: null,
    quantityOnHand: 10,
    nextExpirationDate: null,
    hasExpiredLot: false,
    hasExpiringLot: false,
    ...overrides,
  };
}

describe("computeSamplesHighlights", () => {
  it("counts nothing when everything is healthy", () => {
    const highlights = computeSamplesHighlights([makeRow()]);
    expect(highlights).toEqual({
      lowStockCount: 0,
      outOfStockCount: 0,
      expiringCount: 0,
      expiredCount: 0,
    });
  });

  it("flags low stock at or below the reorder threshold", () => {
    const highlights = computeSamplesHighlights([
      makeRow({ quantityOnHand: 5, reorderThreshold: 5 }),
    ]);
    expect(highlights.lowStockCount).toBe(1);
    expect(highlights.outOfStockCount).toBe(0);
  });

  it("flags out-of-stock separately from low stock", () => {
    const highlights = computeSamplesHighlights([
      makeRow({ quantityOnHand: 0, reorderThreshold: 5 }),
    ]);
    expect(highlights.outOfStockCount).toBe(1);
    expect(highlights.lowStockCount).toBe(0);
  });

  it("prioritizes expired over expiring for the same product", () => {
    const highlights = computeSamplesHighlights([
      makeRow({ hasExpiredLot: true, hasExpiringLot: true }),
    ]);
    expect(highlights.expiredCount).toBe(1);
    expect(highlights.expiringCount).toBe(0);
  });

  it("aggregates across multiple products", () => {
    const highlights = computeSamplesHighlights([
      makeRow({ quantityOnHand: 0 }),
      makeRow({ quantityOnHand: 3, reorderThreshold: 5 }),
      makeRow({ hasExpiringLot: true }),
      makeRow({ hasExpiredLot: true }),
    ]);
    expect(highlights).toEqual({
      lowStockCount: 1,
      outOfStockCount: 1,
      expiringCount: 1,
      expiredCount: 1,
    });
  });
});
