import { describe, expect, it } from "vitest";

import {
  groupReorderReportRows,
  sortReorderReportRows,
} from "@/lib/reorder/sorting";
import type { ReorderReportRow } from "@/lib/reorder/types";

const rows: ReorderReportRow[] = [
  {
    itemId: "1",
    itemName: "Zebra Tape",
    internalSku: "Z-1",
    categoryId: "cat-b",
    categoryName: "Supplies",
    unitName: "Roll",
    unitAbbreviation: "roll",
    preferredVendorId: "vendor-b",
    vendorName: "Beta Vendor",
    totalOnHand: 10,
    reorderPoint: 10,
    parLevel: 20,
    quantityNeeded: 0,
    suggestedOrderQuantity: 10,
    stockStatus: "at_reorder_point",
  },
  {
    itemId: "2",
    itemName: "Alpha Gauze",
    internalSku: "A-1",
    categoryId: "cat-a",
    categoryName: "Wound Care",
    unitName: "Box",
    unitAbbreviation: "box",
    preferredVendorId: "vendor-a",
    vendorName: "Alpha Vendor",
    totalOnHand: 0,
    reorderPoint: 5,
    parLevel: 15,
    quantityNeeded: 5,
    suggestedOrderQuantity: 15,
    stockStatus: "out_of_stock",
  },
  {
    itemId: "3",
    itemName: "Bravo Wipes",
    internalSku: "B-1",
    categoryId: "cat-a",
    categoryName: "Wound Care",
    unitName: "Pack",
    unitAbbreviation: "pk",
    preferredVendorId: "vendor-a",
    vendorName: "Alpha Vendor",
    totalOnHand: 2,
    reorderPoint: 10,
    parLevel: 25,
    quantityNeeded: 8,
    suggestedOrderQuantity: 23,
    stockStatus: "below_reorder",
  },
];

describe("reorder report sorting", () => {
  it("sorts by urgency with out-of-stock items first", () => {
    const sorted = sortReorderReportRows(rows, "urgency");
    expect(sorted[0]?.itemName).toBe("Alpha Gauze");
    expect(sorted[1]?.itemName).toBe("Bravo Wipes");
  });

  it("sorts by vendor then item name", () => {
    const sorted = sortReorderReportRows(rows, "vendor");
    expect(sorted[0]?.vendorName).toBe("Alpha Vendor");
    expect(sorted[0]?.itemName).toBe("Alpha Gauze");
  });

  it("sorts by item name alphabetically", () => {
    const sorted = sortReorderReportRows(rows, "item_name");
    expect(sorted.map((row) => row.itemName)).toEqual([
      "Alpha Gauze",
      "Bravo Wipes",
      "Zebra Tape",
    ]);
  });

  it("sorts by suggested order quantity descending", () => {
    const sorted = sortReorderReportRows(rows, "quantity_needed");
    expect(sorted[0]?.suggestedOrderQuantity).toBe(23);
  });
});

describe("reorder report grouping", () => {
  it("groups rows by vendor", () => {
    const groups = groupReorderReportRows(rows, "vendor");
    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe("Alpha Vendor");
    expect(groups[0]?.rows).toHaveLength(2);
  });

  it("groups rows by category", () => {
    const groups = groupReorderReportRows(rows, "category");
    expect(groups.find((group) => group.label === "Wound Care")?.rows).toHaveLength(
      2
    );
  });
});
