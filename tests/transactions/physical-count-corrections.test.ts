import { describe, expect, it } from "vitest";

import {
  formatReasonCode,
  isPhysicalCountCorrectionReason,
} from "@/lib/format/reason-codes";

describe("physical count correction display", () => {
  it("labels count surplus and shortage reasons clearly", () => {
    expect(formatReasonCode("count_surplus")).toBe("Physical count surplus");
    expect(formatReasonCode("count_shortage")).toBe("Physical count shortage");
  });

  it("identifies physical count correction reasons", () => {
    expect(isPhysicalCountCorrectionReason("count_surplus")).toBe(true);
    expect(isPhysicalCountCorrectionReason("count_shortage")).toBe(true);
    expect(isPhysicalCountCorrectionReason("clinic_use")).toBe(false);
  });
});
