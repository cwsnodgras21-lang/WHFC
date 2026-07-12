"use server";

import { fetchLedgerForDispenseGroup } from "@/lib/dispense/query";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getDispenseLedgerAction(transactionGroupId: string) {
  await requireSession();
  const supabase = await createClient();

  try {
    const rows = await fetchLedgerForDispenseGroup(supabase, transactionGroupId);
    return { success: true as const, rows };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Unable to load ledger entries.",
    };
  }
}
