import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageModuleSettings } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  MODULE_DEFINITIONS,
  getDefaultOrganizationModules,
} from "@/lib/modules/definitions";
import { getOrganizationModules } from "@/lib/modules/fetch";
import type { ModuleDefinition, OrganizationModules } from "@/lib/modules/types";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type AdminModuleRow = ModuleDefinition & {
  enabled: boolean;
};

export type AdminModulesPageData = {
  canManage: boolean;
  permissionMessage: string | null;
  modules: AdminModuleRow[];
  loadError: string | null;
};

export async function getAdminModulesPageData(
  _supabase: Client,
  session: AppSession
): Promise<AdminModulesPageData> {
  const canManage = canManageModuleSettings(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage:
        "Only administrators can view and change organization module settings.",
      modules: [],
      loadError: null,
    };
  }

  try {
    const enabledModules = await getOrganizationModules();
    const modules = MODULE_DEFINITIONS.map((definition) => ({
      ...definition,
      enabled: enabledModules[definition.key],
    }));

    return {
      canManage: true,
      permissionMessage: null,
      modules,
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load module settings.";

    return {
      canManage: true,
      permissionMessage: null,
      modules: MODULE_DEFINITIONS.map((definition) => ({
        ...definition,
        enabled: getDefaultOrganizationModules()[definition.key],
      })),
      loadError: message,
    };
  }
}

export function buildModuleSettingsPayload(
  modules: OrganizationModules
): { moduleKey: string; enabled: boolean }[] {
  return MODULE_DEFINITIONS.map((definition) => ({
    moduleKey: definition.key,
    enabled: modules[definition.key],
  }));
}
