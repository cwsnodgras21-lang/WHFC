import { describe, expect, it } from "vitest";

import { brandLogoFileExists } from "@/lib/brand/logo";

describe("brand logo", () => {
  it("detects the official whfc-logo.png present in public/branding", () => {
    expect(brandLogoFileExists()).toBe(true);
  });
});
