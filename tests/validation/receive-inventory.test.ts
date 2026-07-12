import { describe, expect, it } from "vitest";

import {
  RECEIVE_REASON_CODES,
  receiveInventoryFormSchema,
  receiveInventorySchema,
} from "@/lib/validation/receive-inventory";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("receiveInventoryFormSchema", () => {
  it("accepts valid receive form input", () => {
    const result = receiveInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "12.5",
      reasonCode: "vendor_delivery",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe("12.5");
    }
  });

  it("rejects empty item and location", () => {
    const result = receiveInventoryFormSchema.safeParse({
      itemId: "",
      locationId: "",
      quantity: "5",
      reasonCode: "vendor_delivery",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    const result = receiveInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "0",
      reasonCode: "vendor_delivery",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid transaction date", () => {
    const result = receiveInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "1",
      reasonCode: "vendor_delivery",
      transactionDate: "not-a-date",
    });

    expect(result.success).toBe(false);
  });

  it("does not allow data correction reason codes for receiving", () => {
    expect(RECEIVE_REASON_CODES).not.toContain("data_correction_increase");
    expect(RECEIVE_REASON_CODES).not.toContain("data_correction_decrease");

    const result = receiveInventoryFormSchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: "1",
      reasonCode: "data_correction_increase",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });
});

describe("receiveInventorySchema", () => {
  it("coerces ISO transaction dates for server actions", () => {
    const result = receiveInventorySchema.safeParse({
      itemId: validUuid,
      locationId: otherUuid,
      quantity: 3,
      reasonCode: "initial_stock",
      transactionDate: "2026-07-05T19:30:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactionDate).toBeInstanceOf(Date);
    }
  });
});
