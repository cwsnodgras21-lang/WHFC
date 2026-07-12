import { describe, expect, it } from "vitest";

import {
  createItemSchema,
  itemFormSchema,
  updateItemSchema,
} from "@/lib/validation/item";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("itemFormSchema", () => {
  it("requires par level to be greater than or equal to reorder point", () => {
    const result = itemFormSchema.safeParse({
      itemName: "Gloves",
      internalSku: "GLV-001",
      categoryId: validUuid,
      unitOfMeasureId: otherUuid,
      preferredVendorId: "",
      reorderPoint: "10",
      parLevel: "5",
      active: true,
      trackExpiration: false,
      trackLotNumber: false,
      expirationWarningDays: "90",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("parLevel"))).toBe(
        true
      );
    }
  });

  it("accepts par level equal to reorder point", () => {
    const result = itemFormSchema.safeParse({
      itemName: "Gloves",
      internalSku: "GLV-001",
      categoryId: validUuid,
      unitOfMeasureId: otherUuid,
      preferredVendorId: "",
      reorderPoint: "10",
      parLevel: "10",
      active: true,
      trackExpiration: false,
      trackLotNumber: false,
      expirationWarningDays: "90",
    });

    expect(result.success).toBe(true);
  });
});

describe("createItemSchema", () => {
  it("rejects negative quantities", () => {
    const result = createItemSchema.safeParse({
      itemName: "Gloves",
      internalSku: "GLV-001",
      categoryId: validUuid,
      unitOfMeasureId: otherUuid,
      preferredVendorId: null,
      reorderPoint: -1,
      parLevel: 5,
      active: true,
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid create payloads", () => {
    const result = createItemSchema.safeParse({
      itemName: "Gloves",
      internalSku: "GLV-001",
      categoryId: validUuid,
      unitOfMeasureId: otherUuid,
      preferredVendorId: null,
      reorderPoint: 5,
      parLevel: 20,
      active: true,
      trackExpiration: false,
      trackLotNumber: false,
      expirationWarningDays: 90,
    });

    expect(result.success).toBe(true);
  });
});

describe("updateItemSchema", () => {
  it("requires a valid item id", () => {
    const result = updateItemSchema.safeParse({
      id: "not-a-uuid",
      itemName: "Gloves",
      internalSku: "GLV-001",
      categoryId: validUuid,
      unitOfMeasureId: otherUuid,
      preferredVendorId: null,
      reorderPoint: 5,
      parLevel: 20,
      active: true,
    });

    expect(result.success).toBe(false);
  });
});
