"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import {
  executeCreateCategory,
  executeQuickCreateCategory,
  executeSetCategoryActive,
  executeUpdateCategory,
  type CategoryMutationResult,
} from "@/lib/categories/mutations";
import { createClient } from "@/lib/supabase/server";

function revalidateCategoryPaths() {
  revalidatePath("/administration/categories");
  revalidatePath("/items");
  revalidatePath("/receive");
  revalidatePath("/consume");
}

export async function createCategoryAction(
  rawInput: unknown
): Promise<CategoryMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeCreateCategory(supabase, session, rawInput);

  if (result.success) {
    revalidateCategoryPaths();
  }

  return result;
}

export async function quickCreateCategoryAction(
  rawInput: unknown
): Promise<CategoryMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeQuickCreateCategory(supabase, session, rawInput);

  if (result.success) {
    revalidateCategoryPaths();
  }

  return result;
}

export async function updateCategoryAction(
  rawInput: unknown
): Promise<CategoryMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeUpdateCategory(supabase, session, rawInput);

  if (result.success) {
    revalidateCategoryPaths();
  }

  return result;
}

export async function setCategoryActiveAction(
  categoryId: string,
  active: boolean
): Promise<CategoryMutationResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const result = await executeSetCategoryActive(
    supabase,
    session,
    categoryId,
    active
  );

  if (result.success) {
    revalidateCategoryPaths();
  }

  return result;
}
