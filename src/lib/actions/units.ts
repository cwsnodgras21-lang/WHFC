"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeCreateUnit,
  executeSetUnitActive,
  executeUpdateUnit,
  type UnitMutationResult,
} from "@/lib/units/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateUnitPaths() {
  revalidatePath("/administration/units-of-measure");
  revalidatePath("/items");
  revalidatePath("/receive");
  revalidatePath("/consume");
}

export async function createUnitAction(
  rawInput: unknown
): Promise<UnitMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreateUnit(supabase, session, rawInput);

  if (result.success) {
    revalidateUnitPaths();
  }

  return result;
}

export async function updateUnitAction(
  rawInput: unknown
): Promise<UnitMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateUnit(supabase, session, rawInput);

  if (result.success) {
    revalidateUnitPaths();
  }

  return result;
}

export async function setUnitActiveAction(
  unitId: string,
  active: boolean
): Promise<UnitMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetUnitActive(
    supabase,
    session,
    unitId,
    active
  );

  if (result.success) {
    revalidateUnitPaths();
  }

  return result;
}
