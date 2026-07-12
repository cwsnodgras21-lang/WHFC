import type { ModuleKey, OrganizationModules } from "@/lib/modules/types";
import { isModuleEnabled } from "@/lib/modules/definitions";
import type { UserRole } from "@/lib/auth/session";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Layers,
  MapPin,
  Package,
  PackageMinus,
  PackagePlus,
  ScrollText,
  Settings,
  TrendingDown,
} from "lucide-react";

export type NavGroupId = "inventory" | "reporting" | "administration";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
  /** Minimum roles that can see this link. Omit to allow all authenticated roles. */
  roles?: readonly UserRole[];
  /** Capability module required to show this link. Omit for inventory core routes. */
  module?: ModuleKey;
};

export type NavGroup = {
  id: NavGroupId;
  label: string;
  items: NavItem[];
};

export const NAV_GROUP_ORDER: { id: NavGroupId; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "reporting", label: "Reporting" },
  { id: "administration", label: "Administration" },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  inventory_manager: "Inventory Manager",
  staff: "Staff",
  read_only: "Read Only",
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "inventory" },
  { href: "/items", label: "Items", icon: Package, group: "inventory" },
  { href: "/locations", label: "Locations", icon: MapPin, group: "inventory" },
  {
    href: "/receive",
    label: "Receive",
    icon: PackagePlus,
    group: "inventory",
    roles: ["administrator", "inventory_manager", "staff"],
  },
  {
    href: "/consume",
    label: "Use stock",
    icon: PackageMinus,
    group: "inventory",
    roles: ["administrator", "inventory_manager", "staff"],
  },
  {
    href: "/dispense",
    label: "Dispense",
    icon: FlaskConical,
    group: "inventory",
    roles: ["administrator", "inventory_manager", "staff"],
    module: "procedure_kits",
  },
  {
    href: "/dispense/history",
    label: "Dispense History",
    icon: ScrollText,
    group: "inventory",
    module: "dispense_history",
  },
  {
    href: "/procedure-kits",
    label: "Procedure Kits",
    icon: Layers,
    group: "inventory",
    roles: ["administrator", "inventory_manager"],
    module: "procedure_kits",
  },
  {
    href: "/transfer",
    label: "Transfer",
    icon: ArrowLeftRight,
    group: "inventory",
    roles: ["administrator", "inventory_manager"],
  },
  {
    href: "/physical-counts",
    label: "Physical Counts",
    icon: ClipboardList,
    group: "inventory",
    roles: ["administrator", "inventory_manager"],
  },
  { href: "/transactions", label: "Transactions", icon: ScrollText, group: "reporting" },
  {
    href: "/reorder-suggestions",
    label: "Reorder Suggestions",
    icon: TrendingDown,
    group: "reporting",
    module: "reorder_suggestions",
  },
  {
    href: "/purchase-order-drafts",
    label: "PO Drafts",
    icon: FileText,
    group: "reporting",
    roles: ["administrator", "inventory_manager"],
    module: "po_drafts",
  },
  {
    href: "/reorder-report",
    label: "Reorder Report",
    icon: TrendingDown,
    group: "reporting",
    module: "analytics",
  },
  {
    href: "/expiration",
    label: "Expiration Center",
    icon: CalendarClock,
    group: "reporting",
    module: "expiration_tracking",
  },
  {
    href: "/administration",
    label: "Administration",
    icon: Settings,
    group: "administration",
    roles: ["administrator", "inventory_manager"],
  },
];

export function getNavItemsForRole(
  role: UserRole,
  enabledModules?: OrganizationModules
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) {
      return false;
    }
    if (
      item.module &&
      enabledModules &&
      !isModuleEnabled(enabledModules, item.module)
    ) {
      return false;
    }
    return true;
  });
}

/** Nav items for a role, organized into ordered groups (empty groups dropped). */
export function getNavGroupsForRole(
  role: UserRole,
  enabledModules?: OrganizationModules
): NavGroup[] {
  const items = getNavItemsForRole(role, enabledModules);
  return NAV_GROUP_ORDER.map((group) => ({
    id: group.id,
    label: group.label,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}

export function getNavLabelForPath(pathname: string): string {
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "WHFC Inventory";
}
