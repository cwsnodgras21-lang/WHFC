import type { ModuleDefinition, ModuleKey, OrganizationModules } from "@/lib/modules/types";

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    key: "inventory_core",
    label: "Inventory core",
    description:
      "Items, locations, receive, consume, transfer, physical counts, and the transaction ledger.",
    defaultEnabled: true,
    locked: true,
  },
  {
    key: "expiration_tracking",
    label: "Expiration tracking",
    description:
      "Expiration center, expiration alerts on the dashboard, and expiration dates on receive.",
    defaultEnabled: true,
    locked: false,
  },
  {
    key: "lot_tracking",
    label: "Lot tracking",
    description:
      "Lot numbers, FEFO lot selection on consume, and lot-level stock visibility.",
    defaultEnabled: true,
    locked: false,
  },
  {
    key: "procedure_kits",
    label: "Procedure kits",
    description:
      "Procedure kit catalog, kit dispense workflow, and concentration-based consumption.",
    defaultEnabled: false,
    locked: false,
  },
  {
    key: "dispense_history",
    label: "Dispense history",
    description:
      "Dispense event history, filters, and detail views for kit usage over time.",
    defaultEnabled: false,
    locked: false,
  },
  {
    key: "reorder_suggestions",
    label: "Reorder suggestions",
    description:
      "Usage-based purchasing recommendations with transparent stock math.",
    defaultEnabled: true,
    locked: false,
  },
  {
    key: "po_drafts",
    label: "PO drafts",
    description:
      "Purchase order draft review, vendor grouping, approve, and mark ordered.",
    defaultEnabled: false,
    locked: false,
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "Dashboard charts, reorder report, movement trends, and procedure usage analytics.",
    defaultEnabled: false,
    locked: false,
  },
  {
    key: "integrations",
    label: "Integrations",
    description:
      "External system connections such as EMR procedure mapping (coming soon).",
    defaultEnabled: false,
    locked: false,
  },
  {
    key: "imaging_log",
    label: "Imaging log",
    description:
      "Track imaging orders through scheduling, completion, results, and insurance authorization.",
    defaultEnabled: true,
    locked: false,
  },
] as const;

export const MODULE_DEFINITION_BY_KEY: Record<ModuleKey, ModuleDefinition> =
  Object.fromEntries(
    MODULE_DEFINITIONS.map((definition) => [definition.key, definition])
  ) as Record<ModuleKey, ModuleDefinition>;

export function getDefaultOrganizationModules(): OrganizationModules {
  return Object.fromEntries(
    MODULE_DEFINITIONS.map((definition) => [
      definition.key,
      definition.defaultEnabled,
    ])
  ) as OrganizationModules;
}

export function isModuleEnabled(
  modules: OrganizationModules,
  moduleKey: ModuleKey
): boolean {
  return modules[moduleKey] === true;
}
