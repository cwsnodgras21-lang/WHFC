import { describe, expect, it } from "vitest";

import { isSafeHttpUrl, safeExternalHref } from "@/lib/security/safe-url";

describe("safeExternalHref", () => {
  it("allows http and https URLs", () => {
    expect(safeExternalHref("https://mckesson.com/order")).toBe(
      "https://mckesson.com/order"
    );
    expect(safeExternalHref("http://example.com")).toBe("http://example.com");
  });

  it("rejects dangerous and non-web schemes", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeExternalHref("mailto:a@b.com")).toBeNull();
  });

  it("rejects malformed URLs and empty values", () => {
    expect(safeExternalHref("not a url")).toBeNull();
    expect(safeExternalHref("")).toBeNull();
    expect(safeExternalHref(null)).toBeNull();
    expect(safeExternalHref(undefined)).toBeNull();
  });

  it("isSafeHttpUrl mirrors the guard", () => {
    expect(isSafeHttpUrl("https://ok.com")).toBe(true);
    expect(isSafeHttpUrl("javascript:void(0)")).toBe(false);
  });
});
