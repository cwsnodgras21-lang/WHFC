import type { ModuleKey } from "@/lib/modules/types";

/** Longest-prefix match for module-gated routes. */
const ROUTE_MODULE_PREFIXES: readonly { prefix: string; module: ModuleKey }[] = [
  { prefix: "/admin/modules", module: "inventory_core" },
  { prefix: "/purchase-order-drafts", module: "po_drafts" },
  { prefix: "/reorder-suggestions", module: "reorder_suggestions" },
  { prefix: "/dispense/history", module: "dispense_history" },
  { prefix: "/dispense", module: "procedure_kits" },
  { prefix: "/procedure-kits", module: "procedure_kits" },
  { prefix: "/reorder-report", module: "analytics" },
  { prefix: "/expiration", module: "expiration_tracking" },
];

export function getModuleKeyForPath(pathname: string): ModuleKey | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  for (const entry of ROUTE_MODULE_PREFIXES) {
    if (
      normalized === entry.prefix ||
      normalized.startsWith(`${entry.prefix}/`)
    ) {
      return entry.module;
    }
  }

  return null;
}

export function isPathAllowedForModules(
  pathname: string,
  isEnabled: (moduleKey: ModuleKey) => boolean
): boolean {
  const moduleKey = getModuleKeyForPath(pathname);
  if (!moduleKey) {
    return true;
  }
  return isEnabled(moduleKey);
}
