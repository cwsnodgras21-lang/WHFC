import { describe, expect, it } from "vitest";

import {
  CONSUME_INVENTORY_ROLES,
  MANAGE_ITEMS_ROLES,
  RECEIVE_INVENTORY_ROLES,
  TRANSFER_INVENTORY_ROLES,
  canConsumeInventory,
  canManageCategories,
  canManageItems,
  canManageLocations,
  canManageUnits,
  canManageVendors,
  canAccessAdministration,
  canReceiveInventory,
  canTransferInventory,
  canManagePhysicalCounts,
  canViewItems,
  canViewLocations,
  canViewTransactions,
  canViewReorderReport,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/session";

describe("canReceiveInventory", () => {
  it("allows active staff, inventory managers, and administrators", () => {
    for (const role of RECEIVE_INVENTORY_ROLES) {
      expect(canReceiveInventory(role, true)).toBe(true);
    }
  });

  it("denies read-only users", () => {
    expect(canReceiveInventory("read_only", true)).toBe(false);
  });

  it("denies inactive users regardless of role", () => {
    const roles: UserRole[] = [
      "administrator",
      "inventory_manager",
      "staff",
      "read_only",
    ];

    for (const role of roles) {
      expect(canReceiveInventory(role, false)).toBe(false);
    }
  });
});

describe("canConsumeInventory", () => {
  it("allows active staff, inventory managers, and administrators", () => {
    for (const role of CONSUME_INVENTORY_ROLES) {
      expect(canConsumeInventory(role, true)).toBe(true);
    }
  });

  it("denies read-only users", () => {
    expect(canConsumeInventory("read_only", true)).toBe(false);
  });

  it("denies inactive users regardless of role", () => {
    const roles: UserRole[] = [
      "administrator",
      "inventory_manager",
      "staff",
      "read_only",
    ];

    for (const role of roles) {
      expect(canConsumeInventory(role, false)).toBe(false);
    }
  });
});

describe("canTransferInventory", () => {
  it("allows active administrators and inventory managers", () => {
    for (const role of TRANSFER_INVENTORY_ROLES) {
      expect(canTransferInventory(role, true)).toBe(true);
    }
  });

  it("denies staff and read-only users", () => {
    expect(canTransferInventory("staff", true)).toBe(false);
    expect(canTransferInventory("read_only", true)).toBe(false);
  });

  it("denies inactive users regardless of role", () => {
    for (const role of TRANSFER_INVENTORY_ROLES) {
      expect(canTransferInventory(role, false)).toBe(false);
    }
  });
});

describe("canManagePhysicalCounts", () => {
  it("allows active administrators and inventory managers", () => {
    for (const role of MANAGE_ITEMS_ROLES) {
      expect(canManagePhysicalCounts(role, true)).toBe(true);
    }
  });

  it("denies staff and read-only users", () => {
    expect(canManagePhysicalCounts("staff", true)).toBe(false);
    expect(canManagePhysicalCounts("read_only", true)).toBe(false);
  });
});

describe("canManageItems", () => {
  it("allows active administrators and inventory managers", () => {
    for (const role of MANAGE_ITEMS_ROLES) {
      expect(canManageItems(role, true)).toBe(true);
    }
  });

  it("denies staff and read-only users", () => {
    expect(canManageItems("staff", true)).toBe(false);
    expect(canManageItems("read_only", true)).toBe(false);
  });

  it("denies inactive users regardless of role", () => {
    for (const role of MANAGE_ITEMS_ROLES) {
      expect(canManageItems(role, false)).toBe(false);
    }
  });
});

describe("canViewItems", () => {
  it("allows active users to view the catalog", () => {
    expect(canViewItems(true)).toBe(true);
  });

  it("denies inactive users", () => {
    expect(canViewItems(false)).toBe(false);
  });
});

describe("canViewTransactions", () => {
  it("allows active users to view the ledger", () => {
    expect(canViewTransactions(true)).toBe(true);
  });

  it("denies inactive users", () => {
    expect(canViewTransactions(false)).toBe(false);
  });
});

describe("canViewReorderReport", () => {
  it("allows active users to view the reorder report", () => {
    expect(canViewReorderReport(true)).toBe(true);
  });

  it("denies inactive users", () => {
    expect(canViewReorderReport(false)).toBe(false);
  });
});

describe("location and reference data permissions", () => {
  it("allows inventory managers to manage categories, vendors, and locations", () => {
    expect(canManageCategories("inventory_manager", true)).toBe(true);
    expect(canManageVendors("inventory_manager", true)).toBe(true);
    expect(canManageLocations("inventory_manager", true)).toBe(true);
  });

  it("denies staff", () => {
    expect(canManageCategories("staff", true)).toBe(false);
    expect(canManageVendors("staff", true)).toBe(false);
    expect(canManageLocations("staff", true)).toBe(false);
  });

  it("allows active users to view locations", () => {
    expect(canViewLocations(true)).toBe(true);
    expect(canViewLocations(false)).toBe(false);
  });
});

describe("canAccessAdministration", () => {
  it("allows administrators and inventory managers", () => {
    expect(canAccessAdministration("administrator", true)).toBe(true);
    expect(canAccessAdministration("inventory_manager", true)).toBe(true);
  });

  it("denies staff and inactive users", () => {
    expect(canAccessAdministration("staff", true)).toBe(false);
    expect(canAccessAdministration("read_only", true)).toBe(false);
    expect(canAccessAdministration("administrator", false)).toBe(false);
  });
});

describe("canManageUnits", () => {
  it("allows administrators only", () => {
    expect(canManageUnits("administrator", true)).toBe(true);
    expect(canManageUnits("inventory_manager", true)).toBe(false);
  });
});
