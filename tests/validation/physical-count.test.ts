import { describe, expect, it } from "vitest";

import {
  calculateVariance,
  parseCountedQuantityInput,
  savePhysicalCountLinesSchema,
  startPhysicalCountSchema,
} from "@/lib/validation/physical-count";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const otherUuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("calculateVariance", () => {
  it("returns counted minus system quantity", () => {
    expect(calculateVariance(12, 10)).toBe(2);
    expect(calculateVariance(8, 10)).toBe(-2);
    expect(calculateVariance(10, 10)).toBe(0);
  });
});

describe("parseCountedQuantityInput", () => {
  it("parses non-negative numbers and rejects invalid input", () => {
    expect(parseCountedQuantityInput("5")).toBe(5);
    expect(parseCountedQuantityInput("0")).toBe(0);
    expect(parseCountedQuantityInput("")).toBeNull();
    expect(parseCountedQuantityInput("-1")).toBeNull();
    expect(parseCountedQuantityInput("abc")).toBeNull();
  });
});

describe("startPhysicalCountSchema", () => {
  it("requires a valid location id", () => {
    expect(
      startPhysicalCountSchema.safeParse({ locationId: validUuid }).success
    ).toBe(true);
    expect(
      startPhysicalCountSchema.safeParse({ locationId: "bad" }).success
    ).toBe(false);
  });
});

describe("savePhysicalCountLinesSchema", () => {
  it("requires at least one line with non-negative counted quantity", () => {
    const result = savePhysicalCountLinesSchema.safeParse({
      physicalCountId: validUuid,
      lines: [{ itemId: otherUuid, countedQuantity: 4 }],
    });

    expect(result.success).toBe(true);
  });
});
