import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageExpirationSettings } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import { updateExpirationSettingsSchema } from "@/lib/validation/expiration-settings";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ExpirationSettingsMutationResult =
  | { success: true }
  | { success: false; error: string };

export async function executeUpdateExpirationSettings(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<ExpirationSettingsMutationResult> {
  if (!canManageExpirationSettings(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage expiration settings.",
    };
  }

  const parsed = updateExpirationSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  const { data: org, error: lookupError } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (lookupError || !org) {
    return {
      success: false,
      error: lookupError?.message ?? "Organization settings not found.",
    };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      default_expiration_warning_days: parsed.data.defaultExpirationWarningDays,
      default_sample_expiration_warning_days:
        parsed.data.defaultSampleExpirationWarningDays,
    })
    .eq("id", org.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
