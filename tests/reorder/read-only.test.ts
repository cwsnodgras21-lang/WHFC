import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { canViewReorderReport } from "@/lib/auth/permissions";

describe("canViewReorderReport", () => {
  it("allows active users to view the report", () => {
    expect(canViewReorderReport(true)).toBe(true);
  });

  it("denies inactive users", () => {
    expect(canViewReorderReport(false)).toBe(false);
  });
});

describe("reorder report read-only behavior", () => {
  it("does not expose server actions for report mutations", () => {
    const reportDir = join(process.cwd(), "src", "app", "(app)", "reorder-report");
    const files = readdirSync(reportDir);

    expect(files).not.toContain("actions.ts");
    expect(files.some((file) => file.endsWith(".action.ts"))).toBe(false);
  });

  it("loads report data through select-only helpers", async () => {
    const dataModule = await import("@/lib/data/reorder-report-page");

    expect(typeof dataModule.getReorderReportPageData).toBe("function");
    expect(Object.keys(dataModule)).not.toContain("createPurchaseOrder");
    expect(Object.keys(dataModule)).not.toContain("adjustInventory");
  });
});
