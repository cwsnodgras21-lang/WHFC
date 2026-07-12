import { describe, expect, it } from "vitest";

import {
  applyReorderReportFilters,
  hasActiveReorderReportFilters,
  matchesReorderReportSearch,
} from "@/lib/reorder/filtering";
import type { ReorderReportRow } from "@/lib/reorder/types";

const sampleRows: ReorderReportRow[] = [
  {
    itemId: "1",
    itemName: "Exam Gloves",
    internalSku: "GLV-100",
    categoryId: "cat-a",
    categoryName: "PPE",
    unitName: "Box",
    unitAbbreviation: "box",
    preferredVendorId: "vendor-a",
    vendorName: "MedSupply Co",
    totalOnHand: 0,
    reorderPoint: 10,
    parLevel: 30,
    quantityNeeded: 10,
    suggestedOrderQuantity: 30,
    stockStatus: "out_of_stock",
  },
  {
    itemId: "2",
    itemName: "Bandages",
    internalSku: "BND-200",
    categoryId: "cat-b",
    categoryName: "Wound Care",
    unitName: "Each",
    unitAbbreviation: "each",
    preferredVendorId: null,
    vendorName: null,
    totalOnHand: 8,
    reorderPoint: 10,
    parLevel: 20,
    quantityNeeded: 2,
    suggestedOrderQuantity: 12,
    stockStatus: "below_reorder",
  },
];

describe("reorder report filters", () => {
  it("matches search by item name or SKU", () => {
    expect(matchesReorderReportSearch(sampleRows[0], "glove")).toBe(true);
    expect(matchesReorderReportSearch(sampleRows[0], "glv-100")).toBe(true);
    expect(matchesReorderReportSearch(sampleRows[0], "bandage")).toBe(false);
  });

  it("filters by category and vendor", () => {
    expect(
      applyReorderReportFilters(sampleRows, { categoryId: "cat-a" })
    ).toHaveLength(1);
    expect(
      applyReorderReportFilters(sampleRows, { vendorId: "vendor-a" })
    ).toHaveLength(1);
    expect(
      applyReorderReportFilters(sampleRows, { vendorId: "none" })
    ).toHaveLength(1);
  });

  it("detects active filters", () => {
    expect(hasActiveReorderReportFilters({})).toBe(false);
    expect(hasActiveReorderReportFilters({ search: "glove" })).toBe(true);
    expect(hasActiveReorderReportFilters({ vendorId: "none" })).toBe(true);
  });
});
