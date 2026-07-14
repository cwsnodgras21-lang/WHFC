import type { UserRole } from "@/lib/auth/session";

export const RECEIVE_INVENTORY_ROLES = [
  "administrator",
  "inventory_manager",
  "staff",
] as const satisfies readonly UserRole[];

export type ReceiveInventoryRole = (typeof RECEIVE_INVENTORY_ROLES)[number];

export function canReceiveInventory(role: UserRole, active: boolean): boolean {
  if (!active) {
    return false;
  }
  return (RECEIVE_INVENTORY_ROLES as readonly UserRole[]).includes(role);
}

export const CONSUME_INVENTORY_ROLES = [
  "administrator",
  "inventory_manager",
  "staff",
] as const satisfies readonly UserRole[];

export type ConsumeInventoryRole = (typeof CONSUME_INVENTORY_ROLES)[number];

export function canConsumeInventory(role: UserRole, active: boolean): boolean {
  if (!active) {
    return false;
  }
  return (CONSUME_INVENTORY_ROLES as readonly UserRole[]).includes(role);
}

export const DISPENSE_KIT_ROLES = CONSUME_INVENTORY_ROLES;

export function canDispenseKit(role: UserRole, active: boolean): boolean {
  return canConsumeInventory(role, active);
}

export const MANAGE_ITEMS_ROLES = [
  "administrator",
  "inventory_manager",
] as const satisfies readonly UserRole[];

export type ManageItemsRole = (typeof MANAGE_ITEMS_ROLES)[number];

export function canManageItems(role: UserRole, active: boolean): boolean {
  if (!active) {
    return false;
  }
  return (MANAGE_ITEMS_ROLES as readonly UserRole[]).includes(role);
}

export const MANAGE_PROCEDURE_KITS_ROLES = MANAGE_ITEMS_ROLES;

export function canManageProcedureKits(
  role: UserRole,
  active: boolean
): boolean {
  return canManageItems(role, active);
}

export const TRANSFER_INVENTORY_ROLES = MANAGE_ITEMS_ROLES;

export type TransferInventoryRole = (typeof TRANSFER_INVENTORY_ROLES)[number];

export function canTransferInventory(role: UserRole, active: boolean): boolean {
  return canManageItems(role, active);
}

export function canManagePhysicalCounts(
  role: UserRole,
  active: boolean
): boolean {
  return canManageItems(role, active);
}

export function canViewItems(active: boolean): boolean {
  return active;
}

export const MANAGE_CATEGORIES_ROLES = MANAGE_ITEMS_ROLES;
export const MANAGE_VENDORS_ROLES = MANAGE_ITEMS_ROLES;
export const MANAGE_LOCATIONS_ROLES = MANAGE_ITEMS_ROLES;

export function canManageCategories(role: UserRole, active: boolean): boolean {
  return canManageItems(role, active);
}

export function canManageVendors(role: UserRole, active: boolean): boolean {
  return canManageItems(role, active);
}

export function canManageLocations(role: UserRole, active: boolean): boolean {
  return canManageItems(role, active);
}

export function canViewLocations(active: boolean): boolean {
  return active;
}

export function canViewTransactions(active: boolean): boolean {
  return active;
}

export function canViewDispenseHistory(active: boolean): boolean {
  return active;
}

export function canViewReorderReport(active: boolean): boolean {
  return active;
}

export const MANAGE_REORDER_SUGGESTIONS_ROLES = MANAGE_ITEMS_ROLES;

export function canManageReorderSuggestions(
  role: UserRole,
  active: boolean
): boolean {
  return canManageItems(role, active);
}

export function canViewReorderSuggestions(active: boolean): boolean {
  return active;
}

export function canViewPurchaseOrderDrafts(active: boolean): boolean {
  return active;
}

export function canManagePurchaseOrderDrafts(
  role: UserRole,
  active: boolean
): boolean {
  return canManageItems(role, active);
}

export const MANAGE_UNITS_ROLES = ["administrator"] as const satisfies readonly UserRole[];

export function canManageUnits(role: UserRole, active: boolean): boolean {
  if (!active) {
    return false;
  }
  return (MANAGE_UNITS_ROLES as readonly UserRole[]).includes(role);
}

export function canViewUnits(active: boolean): boolean {
  return active;
}

export const ADMINISTRATION_ROLES = MANAGE_ITEMS_ROLES;

export function canAccessAdministration(role: UserRole, active: boolean): boolean {
  return canManageItems(role, active);
}

export function canManageModuleSettings(role: UserRole, active: boolean): boolean {
  if (!active) {
    return false;
  }
  return role === "administrator";
}

export const MANAGE_IMAGING_ROLES = [
  "administrator",
  "inventory_manager",
  "staff",
] as const satisfies readonly UserRole[];

export function canManageImaging(role: UserRole, active: boolean): boolean {
  if (!active) {
    return false;
  }
  return (MANAGE_IMAGING_ROLES as readonly UserRole[]).includes(role);
}

export function canViewImaging(active: boolean): boolean {
  return active;
}
