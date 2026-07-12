import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageModuleSettings } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { MODULE_DEFINITION_BY_KEY } from "@/lib/modules/definitions";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/modules/types";
import type { Database } from "@/lib/types/database";
import {
  updateModuleSettingsSchema,
  type UpdateModuleSettingsInput,
} from "@/lib/validation/modules";

type Client = SupabaseClient<Database>;

type MutationResult =
  | { success: true }
  | { success: false; error: string };

function mapDbError(message: string): string {
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to change module settings.";
  }
  return message;
}

export async function executeUpdateModuleSettings(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<MutationResult> {
  if (!canManageModuleSettings(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "Only administrators can change module settings.",
    };
  }

  const parsed = updateModuleSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid module settings.",
    };
  }

  return updateModuleSettings(supabase, session, parsed.data);
}

async function updateModuleSettings(
  supabase: Client,
  session: AppSession,
  input: UpdateModuleSettingsInput
): Promise<MutationResult> {
  for (const setting of input.settings) {
    const definition = MODULE_DEFINITION_BY_KEY[setting.moduleKey];
    const enabled = definition.locked ? true : setting.enabled;

    const { error } = await supabase.from("organization_module_settings").upsert(
      {
        organization_id: DEFAULT_ORGANIZATION_ID,
        module_key: setting.moduleKey,
        enabled,
        updated_by: session.user.id,
      },
      { onConflict: "organization_id,module_key" }
    );

    if (error) {
      return { success: false, error: mapDbError(error.message) };
    }
  }

  return { success: true };
}
