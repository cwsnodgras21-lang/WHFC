import { describe, expect, it } from "vitest";

import { getNavItemsForRole, NAV_ITEMS } from "@/lib/navigation";

describe("navigation", () => {
  it("shows administration to administrators and inventory managers", () => {
    const adminNav = getNavItemsForRole("administrator");
    const managerNav = getNavItemsForRole("inventory_manager");
    const staffNav = getNavItemsForRole("staff");

    expect(adminNav.some((item) => item.href === "/administration")).toBe(true);
    expect(managerNav.some((item) => item.href === "/administration")).toBe(true);
    expect(staffNav.some((item) => item.href === "/administration")).toBe(false);
  });

  it("hides write workflows from read-only users", () => {
    const readOnlyNav = getNavItemsForRole("read_only");
    const writeRoutes = ["/receive", "/consume", "/transfer", "/physical-counts"];

    for (const href of writeRoutes) {
      expect(readOnlyNav.some((item) => item.href === href)).toBe(false);
    }
  });

  it("includes core read routes for every role", () => {
    const roles = [
      "administrator",
      "inventory_manager",
      "staff",
      "read_only",
    ] as const;

    for (const role of roles) {
      const items = getNavItemsForRole(role);
      expect(items.some((item) => item.href === "/dashboard")).toBe(true);
      expect(items.some((item) => item.href === "/items")).toBe(true);
      expect(items.some((item) => item.href === "/transactions")).toBe(true);
    }
  });

  it("defines a nav item for each primary route", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/reorder-report");
    expect(hrefs).toContain("/reorder-suggestions");
  });
});
