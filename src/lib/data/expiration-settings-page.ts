import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageExpirationSettings } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type ExpirationSettingsPageData = {
  canManage: boolean;
  permissionMessage: string | null;
  defaultExpirationWarningDays: number;
  defaultSampleExpirationWarningDays: number;
  loadError: string | null;
};

export async function getExpirationSettingsPageData(
  supabase: Client,
  session: AppSession
): Promise<ExpirationSettingsPageData> {
  const canManage = canManageExpirationSettings(
    session.profile.role,
    session.profile.active
  );

  if (!canManage) {
    return {
      canManage: false,
      permissionMessage:
        "You do not have permission to manage expiration settings.",
      defaultExpirationWarningDays: 90,
      defaultSampleExpirationWarningDays: 90,
      loadError: null,
    };
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("default_expiration_warning_days, default_sample_expiration_warning_days")
    .limit(1)
    .maybeSingle();

  return {
    canManage,
    permissionMessage: null,
    defaultExpirationWarningDays: data?.default_expiration_warning_days ?? 90,
    defaultSampleExpirationWarningDays:
      data?.default_sample_expiration_warning_days ?? 90,
    loadError: error?.message ?? null,
  };
}
