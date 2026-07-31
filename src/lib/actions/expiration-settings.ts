"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeUpdateExpirationSettings,
  type ExpirationSettingsMutationResult,
} from "@/lib/expiration/mutations";
import { createClient } from "@/lib/supabase/server";

export async function updateExpirationSettingsAction(
  rawInput: unknown
): Promise<ExpirationSettingsMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateExpirationSettings(supabase, session, rawInput);
  if (result.success) {
    revalidatePath("/administration/expiration-settings");
    revalidatePath("/dashboard");
    revalidatePath("/expiration");
  }
  return result;
}
