import { describe, expect, it } from "vitest";

import {
  calculateSuggestedOrderQuantity,
  getReorderStockStatus,
  getReorderStockStatusLabel,
  getReorderUrgencyRank,
} from "@/lib/reorder/calculations";

describe("reorder calculations", () => {
  it("calculates suggested order quantity to par level", () => {
    expect(calculateSuggestedOrderQuantity(100, 40)).toBe(60);
    expect(calculateSuggestedOrderQuantity(50, 75)).toBe(0);
    expect(calculateSuggestedOrderQuantity(25, 25)).toBe(0);
  });

  it("classifies stock status", () => {
    expect(getReorderStockStatus(0, 10)).toBe("out_of_stock");
    expect(getReorderStockStatus(-2, 10)).toBe("out_of_stock");
    expect(getReorderStockStatus(4, 10)).toBe("below_reorder");
    expect(getReorderStockStatus(10, 10)).toBe("at_reorder_point");
  });

  it("provides readable stock status labels", () => {
    expect(getReorderStockStatusLabel("out_of_stock")).toBe("Out of stock");
    expect(getReorderStockStatusLabel("below_reorder")).toBe(
      "Below reorder point"
    );
    expect(getReorderStockStatusLabel("at_reorder_point")).toBe(
      "At reorder point"
    );
  });

  it("ranks urgency with out of stock first", () => {
    expect(getReorderUrgencyRank("out_of_stock")).toBeLessThan(
      getReorderUrgencyRank("below_reorder")
    );
    expect(getReorderUrgencyRank("below_reorder")).toBeLessThan(
      getReorderUrgencyRank("at_reorder_point")
    );
  });
});
