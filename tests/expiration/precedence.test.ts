import { describe, expect, it } from "vitest";

import { resolveExpirationWarningDays } from "@/lib/data/items-page";

describe("resolveExpirationWarningDays", () => {
  it("uses the item override when present", () => {
    expect(resolveExpirationWarningDays(30, 60, 90)).toBe(30);
  });

  it("falls back to the category override when the item has none", () => {
    expect(resolveExpirationWarningDays(null, 60, 90)).toBe(60);
  });

  it("falls back to the organization default when neither item nor category override", () => {
    expect(resolveExpirationWarningDays(null, null, 45)).toBe(45);
  });

  it("falls back to 90 when nothing is configured", () => {
    expect(resolveExpirationWarningDays(null, null, null)).toBe(90);
  });

  it("treats undefined the same as null at every level", () => {
    expect(resolveExpirationWarningDays(undefined, undefined, undefined)).toBe(90);
  });

  it("item override of a valid low number still wins over higher-precedence-order sources", () => {
    expect(resolveExpirationWarningDays(7, 90, 90)).toBe(7);
  });
});
