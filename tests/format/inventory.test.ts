import { describe, expect, it } from "vitest";

import {
  formatLocationDetail,
  formatSignedQuantityWithUnit,
  isInventoryIncrease,
} from "@/lib/format/inventory";

describe("isInventoryIncrease", () => {
  it("treats receive and transfer-in as increases", () => {
    expect(isInventoryIncrease("RECEIVE", "vendor_delivery")).toBe(true);
    expect(isInventoryIncrease("TRANSFER_IN", "location_transfer")).toBe(true);
  });

  it("treats consume and transfer-out as decreases", () => {
    expect(isInventoryIncrease("CONSUME", "clinic_use")).toBe(false);
    expect(isInventoryIncrease("TRANSFER_OUT", "location_transfer")).toBe(
      false
    );
  });

  it("uses reason code for physical count corrections", () => {
    expect(
      isInventoryIncrease("PHYSICAL_COUNT_CORRECTION", "count_surplus")
    ).toBe(true);
    expect(
      isInventoryIncrease("PHYSICAL_COUNT_CORRECTION", "count_shortage")
    ).toBe(false);
  });
});

describe("formatSignedQuantityWithUnit", () => {
  it("prefixes increases and decreases with unit abbreviation", () => {
    expect(
      formatSignedQuantityWithUnit(5, "RECEIVE", "vendor_delivery", "BT")
    ).toBe("+5 BT");
    expect(
      formatSignedQuantityWithUnit(2, "CONSUME", "clinic_use", "BX")
    ).toBe("-2 BX");
  });

  it("omits sign when direction is unknown", () => {
    expect(
      formatSignedQuantityWithUnit(1, null, null, "EA")
    ).toBe("1 EA");
  });
});

describe("formatLocationDetail", () => {
  it("returns the location name as primary with no secondary detail", () => {
    expect(formatLocationDetail("Supply Closet")).toEqual({
      primary: "Supply Closet",
      secondary: null,
    });
  });

  it("falls back to an em dash when there is no location name", () => {
    expect(formatLocationDetail(null)).toEqual({
      primary: "—",
      secondary: null,
    });
  });
});
