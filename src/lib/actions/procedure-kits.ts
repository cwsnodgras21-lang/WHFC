"use server";

import { revalidatePath } from "next/cache";

import {
  executeDeleteProcedureKit,
  executeSaveProcedureKit,
} from "@/lib/procedure-kits/mutations";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function saveProcedureKitAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSaveProcedureKit(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/procedure-kits");
    revalidatePath(`/procedure-kits/${result.kitId}`);
    revalidatePath("/dispense");
  }

  return result;
}

export async function deactivateProcedureKitAction(kitId: string) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeDeleteProcedureKit(supabase, session, kitId);

  if (result.success) {
    revalidatePath("/procedure-kits");
    revalidatePath("/dispense");
  }

  return result;
}
