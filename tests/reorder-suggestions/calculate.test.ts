import { describe, expect, it } from "vitest";

import {
  buildReorderSuggestions,
  calculateAvailableFromLots,
  calculateDailyUsage,
  calculateEstimatedDaysLeft,
  calculateSuggestedReorderQuantity,
  deriveReasons,
  itemLocationKey,
  shouldShowSuggestion,
  type LotStockSnapshot,
  type ReorderItemMeta,
  type SuggestionActionSnapshot,
  USAGE_WINDOW_DAYS,
} from "@/lib/reorder-suggestions/calculate";

const item: ReorderItemMeta = {
  itemId: "item-1",
  itemName: "Gloves",
  internalSku: "GLV-100",
  unitAbbreviation: "EA",
  reorderPoint: 50,
  parLevel: 100,
  preferredVendorId: "vendor-1",
  vendorName: "MedSupply Co",
  trackExpiration: true,
};

const location = { locationId: "loc-1", locationName: "Main storage" };

function lot(
  overrides: Partial<LotStockSnapshot> & Pick<LotStockSnapshot, "quantityOnHand">
): LotStockSnapshot {
  return {
    itemId: "item-1",
    locationId: "loc-1",
    status: "active",
    daysUntilExpiration: 120,
    ...overrides,
  };
}

describe("calculateAvailableFromLots", () => {
  it("excludes expired and depleted lots from available stock", () => {
    const result = calculateAvailableFromLots([
      lot({ quantityOnHand: 20 }),
      lot({ quantityOnHand: 10, status: "expired" }),
      lot({ quantityOnHand: 5, status: "depleted" }),
    ]);

    expect(result.available).toBe(20);
    expect(result.raw).toBe(35);
    expect(result.expiring.expiredExcluded).toBe(10);
  });

  it("buckets expiring lots into 30/60/90 day windows", () => {
    const result = calculateAvailableFromLots([
      lot({ quantityOnHand: 5, daysUntilExpiration: 15 }),
      lot({ quantityOnHand: 8, daysUntilExpiration: 45 }),
      lot({ quantityOnHand: 3, daysUntilExpiration: 75 }),
    ]);

    expect(result.expiring.within30).toBe(5);
    expect(result.expiring.within60).toBe(8);
    expect(result.expiring.within90).toBe(3);
  });
});

describe("usage and quantity helpers", () => {
  it("calculates daily usage from 30-day window", () => {
    expect(calculateDailyUsage(60, USAGE_WINDOW_DAYS)).toBe(2);
    expect(calculateDailyUsage(0, USAGE_WINDOW_DAYS)).toBe(0);
  });

  it("estimates days left from available stock and daily usage", () => {
    expect(calculateEstimatedDaysLeft(28, 2)).toBe(14);
    expect(calculateEstimatedDaysLeft(0, 2)).toBe(0);
    expect(calculateEstimatedDaysLeft(10, 0)).toBeNull();
  });

  it("suggests reorder quantity from par and 30-day supply target", () => {
    expect(calculateSuggestedReorderQuantity(40, 100, 2)).toBe(60);
    expect(calculateSuggestedReorderQuantity(90, 100, 0)).toBe(10);
  });
});

describe("deriveReasons", () => {
  it("flags low stock, projected stockout, and expiring lots", () => {
    const reasons = deriveReasons({
      totalAvailable: 40,
      reorderPoint: 50,
      daysLeft: 10,
      expiring: {
        within30: 5,
        within60: 0,
        within90: 0,
        expiredExcluded: 0,
      },
    });

    expect(reasons).toEqual(["low_stock", "projected_stockout", "expiring_soon"]);
  });
});

describe("shouldShowSuggestion", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("hides dismissed suggestions until dismissed_until passes", () => {
    const action: SuggestionActionSnapshot = {
      itemId: "item-1",
      locationId: "loc-1",
      action: "dismissed",
      dismissedUntil: "2026-07-10T12:00:00.000Z",
      createdAt: "2026-07-08T12:00:00.000Z",
    };

    expect(shouldShowSuggestion(["low_stock"], action, now)).toBe(false);
    expect(
      shouldShowSuggestion(
        ["low_stock"],
        action,
        new Date("2026-07-11T12:00:00.000Z")
      )
    ).toBe(true);
  });

  it("hides reviewed suggestions", () => {
    const action: SuggestionActionSnapshot = {
      itemId: "item-1",
      locationId: "loc-1",
      action: "reviewed",
      dismissedUntil: null,
      createdAt: "2026-07-08T12:00:00.000Z",
    };

    expect(shouldShowSuggestion(["low_stock"], action, now)).toBe(false);
  });
});

describe("buildReorderSuggestions", () => {
  const key = itemLocationKey("item-1", "loc-1");

  it("builds a suggestion with transparent math when stock is low", () => {
    const lotsByItemLocation = new Map([[key, [lot({ quantityOnHand: 30 })]]]);
    const usageByItemLocation = new Map([[key, 60]]);
    const onHandByItemLocation = new Map([[key, 30]]);
    const latestActions = new Map();

    const suggestions = buildReorderSuggestions({
      items: [item],
      locations: [location],
      onHandByItemLocation,
      lotsByItemLocation,
      usageByItemLocation,
      latestActions,
      now: new Date("2026-07-08T12:00:00.000Z"),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.suggestedReorderQuantity).toBe(70);
    expect(suggestions[0]?.estimatedDaysLeft).toBe(15);
    expect(suggestions[0]?.reasons).toContain("low_stock");
    expect(suggestions[0]?.mathLines.some((line) => line.includes("÷ 30"))).toBe(
      true
    );
  });

  it("falls back to par logic when there is no usage", () => {
    const lotsByItemLocation = new Map([[key, [lot({ quantityOnHand: 30 })]]]);
    const usageByItemLocation = new Map([[key, 0]]);
    const onHandByItemLocation = new Map([[key, 30]]);

    const suggestions = buildReorderSuggestions({
      items: [item],
      locations: [location],
      onHandByItemLocation,
      lotsByItemLocation,
      usageByItemLocation,
      latestActions: new Map(),
    });

    expect(suggestions[0]?.dailyUsage).toBe(0);
    expect(suggestions[0]?.suggestedReorderQuantity).toBe(70);
    expect(
      suggestions[0]?.mathLines.some((line) =>
        line.includes("No recorded usage")
      )
    ).toBe(true);
  });
});
