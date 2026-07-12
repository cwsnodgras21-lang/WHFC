import { describe, expect, it } from "vitest";

import {
  canManageCategories,
  canManageUnits,
  canManageVendors,
  canViewUnits,
} from "@/lib/auth/permissions";

describe("reference data permissions", () => {
  it("allows inventory managers to manage categories and vendors", () => {
    expect(canManageCategories("inventory_manager", true)).toBe(true);
    expect(canManageVendors("inventory_manager", true)).toBe(true);
  });

  it("restricts unit management to administrators", () => {
    expect(canManageUnits("administrator", true)).toBe(true);
    expect(canManageUnits("inventory_manager", true)).toBe(false);
  });

  it("allows inventory managers to view units", () => {
    expect(canViewUnits(true)).toBe(true);
  });

  it("denies inactive users", () => {
    expect(canManageCategories("administrator", false)).toBe(false);
    expect(canManageUnits("administrator", false)).toBe(false);
  });
});

function resolveItemDialogMode(canManage: boolean): "edit" | "view" {
  return canManage ? "edit" : "view";
}

describe("item catalog row interaction", () => {
  it("opens edit mode for managers when a row is clicked", () => {
    expect(resolveItemDialogMode(true)).toBe("edit");
  });

  it("opens view-only mode for staff when a row is clicked", () => {
    expect(resolveItemDialogMode(false)).toBe("view");
  });
});
