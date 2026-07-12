import { describe, expect, it } from "vitest";

import { APP_NAME, APP_SHORT_NAME, PRODUCT_DESCRIPTOR } from "@/lib/constants";

describe("project constants", () => {
  it("exposes the approved application names", () => {
    expect(APP_NAME).toBe("White House Family Care Inventory");
    expect(APP_SHORT_NAME).toBe("WHFC Inventory");
    expect(PRODUCT_DESCRIPTOR).toBe("Inventory Management");
  });
});
