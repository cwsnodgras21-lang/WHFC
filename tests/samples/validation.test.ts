import { describe, expect, it } from "vitest";

import {
  dispenseSampleSchema,
  exceedsAvailableSampleStock,
} from "@/lib/validation/samples";

const PRODUCT_ID = "11111111-1111-1111-8111-111111111111";

describe("dispenseSampleSchema", () => {
  it("accepts a valid dispense payload", () => {
    const result = dispenseSampleSchema.safeParse({
      sampleProductId: PRODUCT_ID,
      quantity: 2,
      patientReference: "AB-1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero quantity", () => {
    const result = dispenseSampleSchema.safeParse({
      sampleProductId: PRODUCT_ID,
      quantity: 0,
      patientReference: "AB-1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative quantity", () => {
    const result = dispenseSampleSchema.safeParse({
      sampleProductId: PRODUCT_ID,
      quantity: -3,
      patientReference: "AB-1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing patient reference", () => {
    const result = dispenseSampleSchema.safeParse({
      sampleProductId: PRODUCT_ID,
      quantity: 1,
      patientReference: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a patient reference over 64 characters (no full names)", () => {
    const result = dispenseSampleSchema.safeParse({
      sampleProductId: PRODUCT_ID,
      quantity: 1,
      patientReference: "x".repeat(65),
    });
    expect(result.success).toBe(false);
  });
});

describe("exceedsAvailableSampleStock", () => {
  it("flags a dispense that exceeds on-hand quantity", () => {
    expect(exceedsAvailableSampleStock(5, 2)).toBe(true);
  });

  it("allows a dispense within on-hand quantity", () => {
    expect(exceedsAvailableSampleStock(2, 5)).toBe(false);
  });

  it("allows a dispense exactly equal to on-hand quantity", () => {
    expect(exceedsAvailableSampleStock(5, 5)).toBe(false);
  });
});
