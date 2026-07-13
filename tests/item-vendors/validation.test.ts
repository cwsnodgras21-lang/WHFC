import { describe, expect, it } from "vitest";

import { saveItemVendorSchema } from "@/lib/validation/item-vendor";

const ITEM = "550e8400-e29b-41d4-a716-446655440000";
const VENDOR = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("saveItemVendorSchema", () => {
  it("coerces numeric strings and normalizes blanks to null", () => {
    const parsed = saveItemVendorSchema.parse({
      itemId: ITEM,
      vendorId: VENDOR,
      isPreferred: true,
      vendorSku: "  ABC-123 ",
      manufacturer: "",
      typicalOrderQuantity: "24",
      leadTimeDays: "5",
      typicalCost: "12.5",
      lastOrderDate: "",
      orderingUrl: "",
    });

    expect(parsed.vendorSku).toBe("ABC-123");
    expect(parsed.manufacturer).toBeNull();
    expect(parsed.typicalOrderQuantity).toBe(24);
    expect(parsed.leadTimeDays).toBe(5);
    expect(parsed.typicalCost).toBe(12.5);
    expect(parsed.lastOrderDate).toBeNull();
    expect(parsed.orderingUrl).toBeNull();
    expect(parsed.isPreferred).toBe(true);
  });

  it("rejects negative numbers and invalid URLs", () => {
    expect(
      saveItemVendorSchema.safeParse({
        itemId: ITEM,
        vendorId: VENDOR,
        typicalCost: "-3",
      }).success
    ).toBe(false);

    expect(
      saveItemVendorSchema.safeParse({
        itemId: ITEM,
        vendorId: VENDOR,
        orderingUrl: "not-a-url",
      }).success
    ).toBe(false);
  });

  it("requires a vendor", () => {
    expect(
      saveItemVendorSchema.safeParse({ itemId: ITEM, vendorId: "" }).success
    ).toBe(false);
  });
});
