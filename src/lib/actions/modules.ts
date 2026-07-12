"use server";

import { revalidatePath } from "next/cache";

import { executeUpdateModuleSettings } from "@/lib/modules/operations";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function updateModuleSettingsAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateModuleSettings(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/admin/modules");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
  }

  return result;
}
