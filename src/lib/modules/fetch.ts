import "server-only";

import { cache } from "react";

import {
  getDefaultOrganizationModules,
  isModuleEnabled,
} from "@/lib/modules/definitions";
import {
  DEFAULT_ORGANIZATION_ID,
  MODULE_KEYS,
  type ModuleKey,
  type OrganizationModules,
} from "@/lib/modules/types";
import { createClient } from "@/lib/supabase/server";

export async function isModuleEnabledForOrganization(
  moduleKey: ModuleKey
): Promise<boolean> {
  const modules = await getOrganizationModules();
  return isModuleEnabled(modules, moduleKey);
}

export const getOrganizationModules = cache(
  async (): Promise<OrganizationModules> => {
    const defaults = getDefaultOrganizationModules();

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("organization_module_settings")
        .select("module_key, enabled")
        .eq("organization_id", DEFAULT_ORGANIZATION_ID);

      if (error || !data || data.length === 0) {
        return defaults;
      }

      const modules = { ...defaults };
      for (const row of data) {
        if (MODULE_KEYS.includes(row.module_key as ModuleKey)) {
          modules[row.module_key as ModuleKey] = row.enabled;
        }
      }

      modules.inventory_core = true;
      return modules;
    } catch {
      return defaults;
    }
  }
);

export async function requireModuleEnabled(
  moduleKey: ModuleKey
): Promise<OrganizationModules> {
  const modules = await getOrganizationModules();
  if (!isModuleEnabled(modules, moduleKey)) {
    return modules;
  }
  return modules;
}
