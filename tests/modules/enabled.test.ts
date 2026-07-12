import { describe, expect, it } from "vitest";

import {
  getDefaultOrganizationModules,
  isModuleEnabled,
} from "@/lib/modules/definitions";
import { getModuleKeyForPath, isPathAllowedForModules } from "@/lib/modules/routes";
import { getNavItemsForRole } from "@/lib/navigation";

describe("module definitions", () => {
  it("enables MVP defaults", () => {
    const modules = getDefaultOrganizationModules();
    expect(modules.inventory_core).toBe(true);
    expect(modules.expiration_tracking).toBe(true);
    expect(modules.lot_tracking).toBe(true);
    expect(modules.reorder_suggestions).toBe(true);
    expect(modules.procedure_kits).toBe(false);
    expect(modules.analytics).toBe(false);
  });

  it("checks module enabled state", () => {
    const modules = getDefaultOrganizationModules();
    expect(isModuleEnabled(modules, "po_drafts")).toBe(false);
    modules.po_drafts = true;
    expect(isModuleEnabled(modules, "po_drafts")).toBe(true);
  });
});

describe("module routes", () => {
  it("maps gated paths to modules", () => {
    expect(getModuleKeyForPath("/dispense")).toBe("procedure_kits");
    expect(getModuleKeyForPath("/dispense/history")).toBe("dispense_history");
    expect(getModuleKeyForPath("/items")).toBeNull();
  });

  it("blocks disabled module paths", () => {
    const modules = getDefaultOrganizationModules();
    expect(
      isPathAllowedForModules("/procedure-kits", (key) =>
        isModuleEnabled(modules, key)
      )
    ).toBe(false);
  });
});

describe("navigation module filtering", () => {
  it("hides procedure kit links when module is disabled", () => {
    const modules = getDefaultOrganizationModules();
    const items = getNavItemsForRole("administrator", modules);
    expect(items.some((item) => item.href === "/procedure-kits")).toBe(false);
    expect(items.some((item) => item.href === "/items")).toBe(true);
  });
});
