import { describe, expect, it } from "vitest";

import {
  approveDraftSchema,
  saveDraftLinesSchema,
} from "@/lib/validation/purchase-order-drafts";

describe("purchase order draft validation", () => {
  it("accepts valid save line payloads", () => {
    const result = saveDraftLinesSchema.safeParse({
      draftId: "550e8400-e29b-41d4-a716-446655440000",
      lines: [
        {
          lineId: "660e8400-e29b-41d4-a716-446655440001",
          quantity: 12,
          notes: "Restock exam rooms",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects notes longer than 500 characters", () => {
    const result = saveDraftLinesSchema.safeParse({
      draftId: "550e8400-e29b-41d4-a716-446655440000",
      lines: [
        {
          lineId: "660e8400-e29b-41d4-a716-446655440001",
          quantity: 12,
          notes: "x".repeat(501),
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts approve draft payload", () => {
    const result = approveDraftSchema.safeParse({
      draftId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
  });
});
