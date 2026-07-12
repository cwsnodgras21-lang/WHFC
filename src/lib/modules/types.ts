export const MODULE_KEYS = [
  "inventory_core",
  "expiration_tracking",
  "lot_tracking",
  "procedure_kits",
  "dispense_history",
  "reorder_suggestions",
  "po_drafts",
  "analytics",
  "integrations",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

export type OrganizationModules = Record<ModuleKey, boolean>;

export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
  /** Cannot be turned off in admin settings. */
  locked: boolean;
};
