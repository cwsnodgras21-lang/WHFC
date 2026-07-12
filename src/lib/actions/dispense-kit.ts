"use server";

import { revalidatePath } from "next/cache";

import { executeDispenseKit } from "@/lib/inventory/dispense-kit";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function dispenseKitAction(rawInput: unknown) {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeDispenseKit(supabase, session, rawInput);

  if (result.success) {
    revalidatePath("/dispense");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/items");
  }

  return result;
}
