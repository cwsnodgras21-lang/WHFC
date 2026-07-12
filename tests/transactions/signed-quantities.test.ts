import { describe, expect, it } from "vitest";

import {
  formatSignedQuantityWithUnit,
  isInventoryIncrease,
} from "@/lib/format/inventory";

describe("transaction ledger signed quantities", () => {
  it("prefixes increases with plus", () => {
    expect(
      formatSignedQuantityWithUnit(12, "RECEIVE", "vendor_delivery", "box")
    ).toBe("+12 box");
  });

  it("prefixes decreases with minus", () => {
    expect(
      formatSignedQuantityWithUnit(3, "CONSUME", "clinic_use", "each")
    ).toBe("-3 each");
  });

  it("derives physical count correction direction from reason code", () => {
    expect(
      isInventoryIncrease("PHYSICAL_COUNT_CORRECTION", "count_surplus")
    ).toBe(true);
    expect(
      isInventoryIncrease("PHYSICAL_COUNT_CORRECTION", "count_shortage")
    ).toBe(false);
    expect(
      formatSignedQuantityWithUnit(
        5,
        "PHYSICAL_COUNT_CORRECTION",
        "count_surplus",
        "box"
      )
    ).toBe("+5 box");
    expect(
      formatSignedQuantityWithUnit(
        2,
        "PHYSICAL_COUNT_CORRECTION",
        "count_shortage",
        "box"
      )
    ).toBe("-2 box");
  });
});
