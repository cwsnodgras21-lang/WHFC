import { describe, expect, it } from "vitest";

import { parseActiveStatusFilter } from "@/lib/validation/catalog-filters";

describe("parseActiveStatusFilter", () => {
  it("accepts active and inactive", () => {
    expect(parseActiveStatusFilter("active")).toBe("active");
    expect(parseActiveStatusFilter("inactive")).toBe("inactive");
  });

  it("defaults unknown or missing values to all", () => {
    expect(parseActiveStatusFilter(undefined)).toBe("all");
    expect(parseActiveStatusFilter("nope")).toBe("all");
    expect(parseActiveStatusFilter(["active", "inactive"])).toBe("active");
  });
});
