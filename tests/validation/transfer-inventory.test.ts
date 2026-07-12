import { describe, expect, it } from "vitest";

import {
  exceedsAvailableOnHand,
  locationsAreSame,
  transferInventoryFormSchema,
  transferInventorySchema,
} from "@/lib/validation/transfer-inventory";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const thirdUuid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("transferInventoryFormSchema", () => {
  it("accepts valid transfer form input", () => {
    const result = transferInventoryFormSchema.safeParse({
      itemId: validUuid,
      fromLocationId: otherUuid,
      toLocationId: thirdUuid,
      quantity: "5",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when source and destination are the same", () => {
    const result = transferInventoryFormSchema.safeParse({
      itemId: validUuid,
      fromLocationId: otherUuid,
      toLocationId: otherUuid,
      quantity: "2",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("toLocationId"))).toBe(
        true
      );
    }
  });

  it("rejects non-positive quantity", () => {
    const result = transferInventoryFormSchema.safeParse({
      itemId: validUuid,
      fromLocationId: otherUuid,
      toLocationId: thirdUuid,
      quantity: "0",
      transactionDate: "2026-07-05T14:30",
    });

    expect(result.success).toBe(false);
  });
});

describe("transferInventorySchema", () => {
  it("coerces ISO transaction dates for server actions", () => {
    const result = transferInventorySchema.safeParse({
      itemId: validUuid,
      fromLocationId: otherUuid,
      toLocationId: thirdUuid,
      quantity: 4,
      transactionDate: "2026-07-05T19:30:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactionDate).toBeInstanceOf(Date);
    }
  });

  it("rejects matching source and destination on the server", () => {
    const result = transferInventorySchema.safeParse({
      itemId: validUuid,
      fromLocationId: otherUuid,
      toLocationId: otherUuid,
      quantity: 1,
      transactionDate: "2026-07-05T19:30:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("locationsAreSame", () => {
  it("detects matching location ids", () => {
    expect(locationsAreSame(otherUuid, otherUuid)).toBe(true);
    expect(locationsAreSame(otherUuid, thirdUuid)).toBe(false);
  });
});

describe("exceedsAvailableOnHand", () => {
  it("detects when quantity exceeds on-hand", () => {
    expect(exceedsAvailableOnHand(5, 4)).toBe(true);
    expect(exceedsAvailableOnHand(4, 4)).toBe(false);
    expect(exceedsAvailableOnHand(3, 4)).toBe(false);
  });
});
