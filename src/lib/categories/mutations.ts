import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageCategories } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/session";
import {
  createCategorySchema,
  quickCreateCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/validation/category";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export type CategoryMutationSuccess = {
  success: true;
  categoryId: string;
};

export type CategoryMutationFailure = {
  success: false;
  error: string;
};

export type CategoryMutationResult =
  | CategoryMutationSuccess
  | CategoryMutationFailure;

function mapDbError(message: string): string {
  if (
    message.includes("duplicate key") ||
    message.includes("categories_name_active_unique") ||
    message.includes("23505")
  ) {
    return "A category with this name already exists.";
  }
  if (message.includes("permission denied") || message.includes("42501")) {
    return "You do not have permission to manage categories.";
  }
  return message;
}

export async function executeCreateCategory(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<CategoryMutationResult> {
  if (!canManageCategories(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage categories.",
    };
  }

  const parsed = createCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return insertCategory(supabase, parsed.data);
}

export async function executeQuickCreateCategory(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<CategoryMutationResult> {
  if (!canManageCategories(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage categories.",
    };
  }

  const parsed = quickCreateCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return insertCategory(supabase, {
    name: parsed.data.name,
    description: null,
    active: true,
  });
}

export async function executeUpdateCategory(
  supabase: Client,
  session: AppSession,
  rawInput: unknown
): Promise<CategoryMutationResult> {
  if (!canManageCategories(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage categories.",
    };
  }

  const parsed = updateCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
    };
  }

  return updateCategoryRecord(supabase, parsed.data);
}

export async function executeSetCategoryActive(
  supabase: Client,
  session: AppSession,
  categoryId: string,
  active: boolean
): Promise<CategoryMutationResult> {
  if (!canManageCategories(session.profile.role, session.profile.active)) {
    return {
      success: false,
      error: "You do not have permission to manage categories.",
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .update({ active })
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  if (!data) {
    return { success: false, error: "Category not found." };
  }

  return { success: true, categoryId: data.id };
}

export async function insertCategory(
  supabase: Client,
  input: CreateCategoryInput
): Promise<CategoryMutationResult> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      description: input.description,
      active: input.active,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, categoryId: data.id };
}

export async function updateCategoryRecord(
  supabase: Client,
  input: UpdateCategoryInput
): Promise<CategoryMutationResult> {
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      description: input.description,
      active: input.active,
    })
    .eq("id", input.id)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: mapDbError(error.message) };
  }

  return { success: true, categoryId: data.id };
}
