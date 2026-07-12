import { describe, expect, it } from "vitest";

import {
  formatPhysicalCountStatus,
  formatVariance,
  physicalCountStatusBadgeVariant,
} from "@/lib/format/inventory";

describe("physical count formatting", () => {
  it("labels count statuses for badges", () => {
    expect(formatPhysicalCountStatus("in_progress")).toBe("In progress");
    expect(formatPhysicalCountStatus("completed")).toBe("Completed");
    expect(physicalCountStatusBadgeVariant("completed")).toBe("success");
  });

  it("formats variance with sign", () => {
    expect(formatVariance(2)).toBe("+2");
    expect(formatVariance(-1.5)).toBe("-1.5");
    expect(formatVariance(0)).toBe("0");
  });
});
