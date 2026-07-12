import { describe, expect, it } from "vitest";

import {
  CONSUME_REASON_CODES,
  consumeInventoryFormSchema,
  consumeInventorySchema,
  exceedsAvailableOnHand,
} from "@/lib/validation/consume-inventory";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("consumeInventoryFormSchema", () => {
  it("accepts valid consume form input", () => {
    const result = consumeInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "3",
      reasonCode: "clinic_use",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty item and location", () => {
    const result = consumeInventoryFormSchema.safeParse({
      itemId: "",
      locationId: "",
      quantity: "2",
      reasonCode: "clinic_use",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    const result = consumeInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "0",
      reasonCode: "clinic_use",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });

  it("rejects receive-only reason codes", () => {
    expect(CONSUME_REASON_CODES).not.toContain("vendor_delivery");

    const result = consumeInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "1",
      reasonCode: "vendor_delivery",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });
});

describe("consumeInventorySchema", () => {
  it("coerces ISO transaction dates for server actions", () => {
    const result = consumeInventorySchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 2,
      reasonCode: "expired_disposal",
      transactionDate: "2026-07-05T19:30:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactionDate).toBeInstanceOf(Date);
    }
  });
});

describe("exceedsAvailableOnHand", () => {
  it("detects when quantity exceeds on-hand", () => {
    expect(exceedsAvailableOnHand(5, 4)).toBe(true);
    expect(exceedsAvailableOnHand(4, 4)).toBe(false);
    expect(exceedsAvailableOnHand(3, 4)).toBe(false);
  });
});
